import { Router, type Response } from 'express';
import { analyzeVacancy, decide, getDecision, getRadar, openVacancy, type Result } from './handlers.js';

export const api = Router();
const send = (res: Response, r: Result) => res.status(r.status).json(r.body);

api.get('/radar', (_req, res) => send(res, getRadar()));
api.post('/positions/:id/vacancy', (req, res) => send(res, openVacancy(Number(req.params.id))));
api.post('/vacancies/:id/analyze', (req, res) => send(res, analyzeVacancy(Number(req.params.id), req.body?.jobDescription)));
api.post('/vacancies/:id/decide', (req, res) => send(res, decide(Number(req.params.id), Number(req.body?.employeeId))));
api.get('/vacancies/:id/decision', (req, res) => send(res, getDecision(Number(req.params.id))));
