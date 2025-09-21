// request-reply.ts
import { Observable, firstValueFrom, of, Subscription } from 'rxjs';
import { filter, map, take, timeout, catchError } from 'rxjs/operators';

// Messages "fil de fer"
export type ReqMsg<TReq> = { id: number; type: 'req'; req: TReq };
export type ResOk<TRes> = { ok: true; data: TRes };
export type ResErr = { ok: false; error: string };
export type ResMsg<TRes> = { id: number; type: 'res'; res: ResOk<TRes> | ResErr };

// ===== CLIENT =====
export class RequestReplyClient<TReq, TRes> {
    private nextId = 1;

    constructor(
        // "sink" pour publier les requêtes (Subject, Observer ou tout objet avec next(...))
        private readonly requestSink: { next: (msg: ReqMsg<TReq>) => void },
        // flux de réponses
        private readonly response$: Observable<ResMsg<TRes>>,
        private readonly defaultTimeoutMs: number = 5000
    ) { }

    ask(req: TReq, timeoutMs = this.defaultTimeoutMs): Promise<ResOk<TRes> | ResErr> {
        const id = this.nextId++;
        const reply$ = this.response$.pipe(
            filter(m => m.type === 'res' && m.id === id),
            map(m => m.res),
            take(1),
            timeout({ each: timeoutMs }),
            // on renvoie une réponse d'erreur plutôt que de throw
            catchError(err => of<ResErr>({ ok: false, error: String(err?.message ?? err) }))
        );
        const p = firstValueFrom(reply$);
        this.requestSink.next({ type: 'req', id, req });
        return p;
    }
}

// ===== SERVER =====
export class RequestReplyServer<TReq, TRes> {
    private sub?: Subscription;

    constructor(
        // flux des requêtes entrantes
        private readonly request$: Observable<ReqMsg<TReq>>,
        // "sink" pour publier les réponses
        private readonly responseSink: { next: (msg: ResMsg<TRes>) => void }
    ) { }

    /**
     * Démarre le service. `handler` peut être sync ou async.
     * Tu peux appeler start() une fois; appelle stop() pour arrêter.
     */
    start(handler: (req: TReq) => Promise<TRes> | TRes) {
        this.stop();
        this.sub = this.request$.subscribe(async m => {
            if (m.type !== 'req') return;
            try {
                const data = await handler(m.req);
                this.responseSink.next({ type: 'res', id: m.id, res: { ok: true, data } });
            } catch (e: any) {
                this.responseSink.next({ type: 'res', id: m.id, res: { ok: false, error: String(e?.message ?? e) } });
            }
        });
    }

    stop() { this.sub?.unsubscribe(); this.sub = undefined; }
}
