// app/api/payments/mpesa/stkpush/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { phoneNumber, amount, accountReference } = await req.json();

        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const passkey = process.env.MPESA_PASSKEY;
        const shortcode = process.env.MPESA_BUSINESS_SHORTCODE || "174379";

        // 1. Fetch OAuth Access Token from Safaricom
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const tokenRes = await fetch(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: { Authorization: `Basic ${auth}` },
            }
        );
        const { access_token } = await tokenRes.json();

        // 2. Build Timestamp & Password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

        // 3. Trigger STK Push Request
        const stkRes = await fetch(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount),
                    PartyA: phoneNumber,
                    PartyB: shortcode,
                    PhoneNumber: phoneNumber,
                    CallBackURL: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/mpesa/callback`,
                    AccountReference: accountReference || "KRA-CUSTOMS",
                    TransactionDesc: "Customs Duty Payment",
                }),
            }
        );

        const stkData = await stkRes.json();
        return NextResponse.json(stkData);
    } catch (error) {
        console.error("M-Pesa STK error:", error);
        return NextResponse.json(
            { error: "M-Pesa STK dispatch failed." },
            { status: 500 }
        );
    }
}
