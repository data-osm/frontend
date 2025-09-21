import { BaseMessageMap, PoolWorker, WorkerPool } from "../giro-3d-module";


export class StreamWorkerPool<T extends string, R extends BaseMessageMap<T>> extends WorkerPool<T, R> {


    constructor(options) {
        super(options);
    }

    /**
   * Sends a message to the first available worker, then waits for a response matching this
   * message's id, then returns this response, or throw an error if an error response is received.
   */
    //   payload: TMessageMap[K]['payload'],
    //@ts-expect-error
    queue<T>(
        type: T,
        payload: any,
        transfer?: Transferable[],
    ): PoolWorker {
        //@ts-expect-error
        if (this._disposed) {
            throw new Error('this object is disposed');
        }

        //@ts-expect-error
        const wrapper = this.getWorker();

        wrapper.counter.increment();

        if (wrapper.idleTimeout) {
            clearTimeout(wrapper.idleTimeout);
            wrapper.idleTimeout = null;
        }

        const worker: PoolWorker = wrapper.worker;

        const message = {
            //@ts-expect-error
            id: this._messageId++,
            payload,
            type: type as string,
        };

        worker.postMessage(message, transfer ?? []);

        return worker;

        // return new Promise((resolve, reject) => {
        //     // eslint-disable-next-line prefer-const
        //     // let stopListening: () => void;

        //     const onResponse = (event: MessageEvent<Response>) => {
        //         const response = event.data;
        //         //@ts-expect-error
        //         if (response.requestId === message.id) {
        //             // stopListening();

        //             if ('error' in response) {
        //                 //@ts-expect-error
        //                 reject(new Error(response.error));
        //             } else {
        //                 //@ts-expect-error
        //                 resolve(response.payload);
        //             }
        //         }
        //     };

        //     // stopListening = () => {
        //     //     wrapper.counter.decrement();

        //     //     // The worker is idle, start the termination timeout. It will be cancelled
        //     //     // if the worker becomes busy again before the timeout finishes.
        //     //     if (!wrapper.counter.loading) {
        //     //         this.startWorkerTerminationTimeout(wrapper);
        //     //     }

        //     //     worker.removeEventListener('message', onResponse);
        //     // };

        //     worker.addEventListener('message', onResponse);
        //     worker.postMessage(message, transfer ?? []);
        // });
    }

}