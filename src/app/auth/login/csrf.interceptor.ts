import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

export function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler) {
        const csrfToken = getCookie('csrftoken');

        if (csrfToken && req.method !== 'GET' && req.method !== 'HEAD') {
            const cloned = req.clone({
                setHeaders: {
                    'X-CSRFToken': csrfToken
                },
                withCredentials: true
            });
            return next.handle(cloned);
        }

        return next.handle(req.clone({ withCredentials: true }));
    }
}