/**
 * SLA Predictor Service
 * Path: services/slaPredictor.js
 * 
 * Analyzes active tickets, historical resolution rates, agent workloads,
 * and issue complexity to estimate breach risks and schedule preventive actions.
 */

import { SLAEvent, SLA_METRICS, SLA_EVENT_TYPES } from "../models/SLAEvent.js";
import { Ticket, TICKET_PRIORITY, TICKET_STATUS } from "../models/Ticket.js";

// Standard SLA targets in minutes based on ticket priority
export const DEFAULT_SLA_TARGETS = {
    [TICKET_PRIORITY.URGENT]: { firstResponse: 15, resolution: 120 },
    [TICKET_PRIORITY.HIGH]: { firstResponse: 60, resolution: 240 },
    [TICKET_PRIORITY.MEDIUM]: { firstResponse: 240, resolution: 1440 }, // 24 hours
    [TICKET_PRIORITY.LOW]: { firstResponse: 720, resolution: 2880 },   // 48 hours
};

export class SLAPredictorService {
    /**
     * Evaluates breach risks for all open tickets in an organization
     * @param {Object} pg - Fastify PostgreSQL client/pool
     * @param {number|string} [orgId] 
     * @returns {Promise<Array<Object>>} Risk evaluation results
     */
    static async evaluateActiveTickets(pg, orgId = null) {
        const openTickets = await Ticket.findAll(pg, {
            orgId,
            status: TICKET_STATUS.OPEN,
            limit: 100,
        });

        const pendingTickets = await Ticket.findAll(pg, {
            orgId,
            status: TICKET_STATUS.PENDING,
            limit: 100,
        });

        const activeTickets = [...openTickets, ...pendingTickets];
        const predictions = [];

        for (const ticket of activeTickets) {
            const prediction = await this.predictTicketBreach(pg, ticket);
            predictions.push(prediction);

            // Trigger automatic warning event if risk exceeds threshold (> 75%)
            if (prediction.riskScore >= 75 && !prediction.isAlreadyBreached) {
                await this.triggerSLAWarning(pg, ticket, prediction);
            }
        }

        return predictions;
    }

    /**
     * Calculates breach probability and projected completion time for a single ticket
     * @param {Object} pg 
     * @param {Ticket} ticket 
     * @returns {Promise<Object>}
     */
    static async predictTicketBreach(pg, ticket) {
        const slaEvents = await SLAEvent.findByTicketId(pg, ticket.id);
        const pendingSLA = slaEvents.find((evt) => !evt.completedAt);

        // If no active SLA target set, derive target from default priority guidelines
        const priorityTargets = DEFAULT_SLA_TARGETS[ticket.priority] || DEFAULT_SLA_TARGETS[TICKET_PRIORITY.MEDIUM];
        const targetMinutes = pendingSLA?.targetDurationMinutes || priorityTargets.firstResponse;

        const createdAtTime = new Date(ticket.createdAt).getTime();
        const dueAtTime = pendingSLA?.dueAt
            ? new Date(pendingSLA.dueAt).getTime()
            : createdAtTime + targetMinutes * 60 * 1000;

        const now = Date.now();
        const timeRemainingMs = dueAtTime - now;
        const timeRemainingMinutes = Math.round(timeRemainingMs / (1000 * 60));

        // Base Risk Factors
        let riskScore = 0;
        const riskFactors = [];

        // 1. Time Consumption Factor
        const totalDurationMs = dueAtTime - createdAtTime;
        const elapsedPercentage = totalDurationMs > 0
            ? Math.min(100, Math.max(0, ((now - createdAtTime) / totalDurationMs) * 100))
            : 100;

        if (timeRemainingMinutes <= 0) {
            riskScore = 100;
            riskFactors.push("SLA_TIME_EXPIRED");
        } else if (elapsedPercentage >= 80) {
            riskScore += 50;
            riskFactors.push("SLA_TIME_80_PERCENT_ELAPSED");
        } else if (elapsedPercentage >= 50) {
            riskScore += 25;
            riskFactors.push("SLA_TIME_50_PERCENT_ELAPSED");
        }

        // 2. Unassigned Ticket Escalation
        if (!ticket.assignedTo) {
            riskScore += 20;
            riskFactors.push("UNASSIGNED_TICKET");
        }

        // 3. Priority Multiplier
        if (ticket.priority === TICKET_PRIORITY.URGENT) {
            riskScore += 15;
            riskFactors.push("URGENT_PRIORITY_WEIGHT");
        }

        // Cap score at 100
        riskScore = Math.min(100, Math.max(0, riskScore));

        return {
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: ticket.assignedTo,
            dueAt: new Date(dueAtTime).toISOString(),
            timeRemainingMinutes,
            elapsedPercentage: parseFloat(elapsedPercentage.toFixed(2)),
            riskScore,
            riskFactors,
            isAlreadyBreached: timeRemainingMinutes <= 0,
        };
    }

    /**
     * Initializes SLA tracking targets upon ticket creation
     * @param {Object} pg 
     * @param {Ticket} ticket 
     * @returns {Promise<SLAEvent>}
     */
    static async initializeSLATarget(pg, ticket) {
        const targets = DEFAULT_SLA_TARGETS[ticket.priority] || DEFAULT_SLA_TARGETS[TICKET_PRIORITY.MEDIUM];
        const dueAt = new Date(Date.now() + targets.firstResponse * 60 * 1000).toISOString();

        return await SLAEvent.record(pg, {
            ticketId: ticket.id,
            orgId: ticket.orgId,
            metric: SLA_METRICS.FIRST_RESPONSE,
            eventType: SLA_EVENT_TYPES.TARGET_SET,
            targetDurationMinutes: targets.firstResponse,
            dueAt,
        });
    }

    /**
     * Records an SLA warning event when high breach probability is predicted
     * @param {Object} pg 
     * @param {Ticket} ticket 
     * @param {Object} prediction 
     * @returns {Promise<SLAEvent>}
     */
    static async triggerSLAWarning(pg, ticket, prediction) {
        return await SLAEvent.record(pg, {
            ticketId: ticket.id,
            orgId: ticket.orgId,
            metric: SLA_METRICS.FIRST_RESPONSE,
            eventType: SLA_EVENT_TYPES.WARNING_TRIGGERED,
            dueAt: prediction.dueAt,
            metadata: {
                riskScore: prediction.riskScore,
                riskFactors: prediction.riskFactors,
                timeRemainingMinutes: prediction.timeRemainingMinutes,
                predictedAt: new Date().toISOString(),
            },
        });
    }
}

/**
 * Named exports to resolve direct imports like:
 * import { predictSLARisk } from "../services/slaPredictor.js"
 */
export async function predictSLARisk(pg, ticket) {
    return SLAPredictorService.predictTicketBreach(pg, ticket);
}

export const evaluateActiveTickets = SLAPredictorService.evaluateActiveTickets.bind(SLAPredictorService);
export const predictTicketBreach = SLAPredictorService.predictTicketBreach.bind(SLAPredictorService);
export const initializeSLATarget = SLAPredictorService.initializeSLATarget.bind(SLAPredictorService);
export const triggerSLAWarning = SLAPredictorService.triggerSLAWarning.bind(SLAPredictorService);

export default SLAPredictorService;