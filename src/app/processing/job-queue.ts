import { BehaviorSubject, Subject, interval, from, firstValueFrom } from "rxjs";
import { startWith, switchMap, tap, filter, take } from "rxjs/operators";
import { TileState } from "../ol-module";
import VectorRenderTile from "ol/VectorRenderTile";
/** --------- JOB QUEUE AVEC CONCURRENCY --------- */

type JobFn<T = unknown> = () => Promise<T>;

export interface JobDoneEvent<Result = unknown, Meta = unknown> {
    id: number;
    meta?: Meta;
    result: Result;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
}

/** ---------- JobQueue avec événement "done$" ---------- */
export class JobQueue<Meta = unknown> {
    private queue: Array<{
        id: number;
        fn: JobFn<any>;
        resolve: (v: any) => void;
        reject: (e: any) => void;
        meta?: Meta;
    }> = [];
    private running = 0;
    private nextId = 1;

    /** Événements */
    public readonly done$ = new Subject<JobDoneEvent<any, Meta>>();
    public readonly error$ = new Subject<{ id: number; meta?: Meta; error: any }>();

    constructor(private concurrency = 1) {
        this.concurrency = Math.max(1, Math.floor(concurrency));
    }

    setConcurrency(n: number) {
        this.concurrency = Math.max(1, Math.floor(n));
        this.pump();
    }

    /** Ajoute un job + méta (ex: { tileId }) et renvoie la Promise du job */
    enqueue<T>(fn: JobFn<T>, meta?: Meta): Promise<T> {
        const id = this.nextId++;
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ id, fn, resolve, reject, meta });
            this.pump();
        });
    }

    clear() {
        this.queue = [];
        this.running = 0;
        this.pump();
    }

    private pump() {
        while (this.running < this.concurrency && this.queue.length > 0) {
            const { id, fn, resolve, reject, meta } = this.queue.shift()!;
            this.running++;
            const startedAt = Date.now();

            Promise.resolve()
                .then(fn)
                .then((result) => {
                    resolve(result);
                    const finishedAt = Date.now();
                    this.done$.next({
                        id,
                        meta,
                        result,
                        startedAt,
                        finishedAt,
                        durationMs: finishedAt - startedAt,
                    });
                })
                .catch((error) => {
                    reject(error);
                    this.error$.next({ id, meta, error });
                })
                .finally(() => {
                    this.running--;
                    this.pump();
                });
        }
    }

    get size() {
        return this.queue.length;
    }
    get active() {
        return this.running;
    }
}

export function createTileStateJob(
    tile: VectorRenderTile,
    periodMs = 500
): { job: () => Promise<void>; state$: BehaviorSubject<boolean> } {
    const getTileState = () => {
        const tileState = tile.getState()
        return tileState != TileState.LOADING && tileState != TileState.IDLE
    };
    // Valeur initiale
    const state$ = new BehaviorSubject<boolean>(false);

    const job = async () => {
        tile.getSourceTiles()
        // Initialise le BehaviorSubject avec l'état courant
        state$.next(await Promise.resolve(getTileState()));

        // Émet immédiatement (startWith(0)) puis toutes les `periodMs`
        const done$ = interval(periodMs).pipe(
            startWith(0),
            switchMap(() => from(Promise.resolve(getTileState()))),
            tap((v) => state$.next(v)),
            filter((v) => v === true),
            take(1)
        );

        await firstValueFrom(done$);
        state$.complete();
    };

    return { job, state$ };
}