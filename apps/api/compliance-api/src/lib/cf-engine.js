// lib/cf-engine.js

/**
 * East African Community (EAC) Common External Tariff Rates & Levies
 */
const LEVIES = {
    IDF_RATE: 0.025, // Import Declaration Fee (2.5%)
    RDL_RATE: 0.020, // Railway Development Levy (2.0%)
    VAT_RATE: 0.160, // Value Added Tax (16%)
};

/**
 * Cross-validates documents to flag freight discrepancies before Customs filing
 */
export function validateCargoDiscrepancies(invoiceData, packingListData) {
    const flags = [];

    // 1. Weight Discrepancy Check
    if (invoiceData.grossWeightKg && packingListData.grossWeightKg) {
        const diff = Math.abs(invoiceData.grossWeightKg - packingListData.grossWeightKg);
        if (diff > 5) {
            flags.push({
                severity: 'CRITICAL',
                code: 'DISCREPANCY_WEIGHT',
                message: `Weight mismatch between Commercial Invoice (${invoiceData.grossWeightKg}kg) and Packing List (${packingListData.grossWeightKg}kg).`,
            });
        }
    }

    // 2. Quantity Discrepancy Check
    if (invoiceData.totalUnits !== packingListData.totalUnits) {
        flags.push({
            severity: 'CRITICAL',
            code: 'DISCREPANCY_QTY',
            message: `Unit quantity mismatch: Invoice lists ${invoiceData.totalUnits} items, Packing List lists ${packingListData.totalUnits} items.`,
        });
    }

    return flags;
}

/**
 * Calculates Customs Duty & Taxes (Standard EAC CET vs. Preferential AfCFTA)
 */
export function calculateCustomsAssessment({ cifValueUsd, exchangeRateKe = 129.50, items, isAfcftaEligible = false }) {
    const cifValueKes = cifValueUsd * exchangeRateKe;

    let totalImportDutyKes = 0;

    const calculatedItems = items.map((item) => {
        const itemCifKes = item.totalPriceUsd * exchangeRateKe;

        // EAC Standard Cet Rate (e.g. 25% for finished auto parts, 10% for intermediate)
        const standardDutyRate = item.cetRate || 0.25;

        // Under AfCFTA preferential treatment, duty is discounted (e.g. 50% concession phase-in)
        const effectiveDutyRate = isAfcftaEligible ? standardDutyRate * 0.5 : standardDutyRate;

        const importDutyKes = itemCifKes * effectiveDutyRate;
        totalImportDutyKes += importDutyKes;

        return {
            ...item,
            cifValueKes,
            standardDutyRate,
            effectiveDutyRate,
            importDutyKes,
        };
    });

    // Statutory Levies Calculation
    const idfKes = cifValueKes * LEVIES.IDF_RATE;
    const rdlKes = cifValueKes * LEVIES.RDL_RATE;

    // Taxable Value for VAT = CIF + Import Duty + IDF + RDL
    const vatTaxableBase = cifValueKes + totalImportDutyKes + idfKes + rdlKes;
    const vatKes = vatTaxableBase * LEVIES.VAT_RATE;

    const totalCustomsTaxKes = totalImportDutyKes + idfKes + rdlKes + vatKes;

    return {
        exchangeRateKe,
        cifValueUsd,
        cifValueKes,
        taxBreakdown: {
            importDutyKes: Math.round(totalImportDutyKes),
            idfKes: Math.round(idfKes),
            rdlKes: Math.round(rdlKes),
            vatKes: Math.round(vatKes),
            totalCustomsTaxKes: Math.round(totalCustomsTaxKes),
        },
        items: calculatedItems,
    };
}

/**
 * Generates standardized Single Window XML Payload (KRA iCMS / ASYCUDA World Compatible)
 */
export function generateCustomsXmlDeclaration(shipmentData, assessment) {
    return `<?xml version="1.0" encoding="UTF-8"?>
  <CustomsDeclaration xmlns="http://customs.go.ke/icms/v4" Type="IM4">
    <Header>
      <DeclarationType>IMPORT_CLEARANCE</DeclarationType>
      <DeclarantTaxId>${shipmentData.importerTaxId}</DeclarantTaxId>
      <ImporterName><![CDATA[${shipmentData.importerName}]]></ImporterName>
      <ExporterName><![CDATA[${shipmentData.exporterName}]]></ExporterName>
      <CountryOfOrigin>${shipmentData.originCountry}</CountryOfOrigin>
      <PortOfDischarge>${shipmentData.portOfDischarge}</PortOfDischarge>
      <Incoterm>${shipmentData.incoterm}</Incoterm>
    </Header>
    <Valuation>
      <Currency>USD</Currency>
      <TotalCIFUsd>${assessment.cifValueUsd}</TotalCIFUsd>
      <ExchangeRate>${assessment.exchangeRateKe}</ExchangeRate>
      <TotalDutyPayableKES>${assessment.taxBreakdown.totalCustomsTaxKes}</TotalDutyPayableKES>
    </Valuation>
    <TaxBreakdown>
      <ImportDuty>${assessment.taxBreakdown.importDutyKes}</ImportDuty>
      <IDF>${assessment.taxBreakdown.idfKes}</IDF>
      <RDL>${assessment.taxBreakdown.rdlKes}</RDL>
      <VAT>${assessment.taxBreakdown.vatKes}</VAT>
    </TaxBreakdown>
  </CustomsDeclaration>`;
}