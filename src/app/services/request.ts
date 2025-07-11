import { HttpClient } from "@angular/common/http";
import { getCookie } from "../auth/login/csrf.interceptor";
import { Observable, of, switchMap } from "rxjs";
import { environment } from "../../environments/environment";

export abstract class OsmDataRequest {
    urlPrefix = environment.backend

    constructor(
        private http: HttpClient
    ) {

    }

    /**
   * Get header
   */
    get_header() {
        return {
            withCredentials: true,
            headers: {
                'X-CSRFToken': getCookie('csrftoken') || '',
                // "withCredentials": "true",
                'Content-Type': 'application/json'
            }
        }
    }

    getCSRFToken(): Observable<any> {
        return this.http.get(this.urlPrefix + '/api/csrf/', {
            withCredentials: true
        });
    }
    safePost<T>(url: string, data: any): Observable<T> {
        const csrf = getCookie('csrftoken');

        const ensureCsrf$ = csrf ? of(null) : this.getCSRFToken();

        return ensureCsrf$.pipe(
            switchMap(() =>
                this.http.post<T>(this.urlPrefix + url, data, {
                    withCredentials: true,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken') || '',
                    },
                })
            )
        );
    }

    safePut<T>(url: string, data: any): Observable<T> {
        const csrf = getCookie('csrftoken');

        const ensureCsrf$ = csrf ? of(null) : this.getCSRFToken();

        return ensureCsrf$.pipe(
            switchMap(() =>
                this.http.put<T>(this.urlPrefix + url, data, {
                    withCredentials: true,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken') || '',
                    },
                })
            )
        );
    }

    safeGet<T>(url: string, responseType?: string): Observable<T> {
        const csrf = getCookie('csrftoken');

        const ensureCsrf$ = csrf ? of(null) : this.getCSRFToken();
        const headers = this.get_header()
        if (responseType) {
            headers['responseType'] = responseType
        }
        return ensureCsrf$.pipe(
            switchMap(() =>
                this.http.get<T>(this.urlPrefix + url, headers)
            )
        );
    }

    safeDelete<T>(url: string, data?): Observable<T> {
        const csrf = getCookie('csrftoken');

        const ensureCsrf$ = csrf ? of(null) : this.getCSRFToken();
        if (data === undefined) {
            data = {}
        }
        return ensureCsrf$.pipe(
            switchMap(() =>
                this.http.delete<T>(this.urlPrefix + url, {
                    withCredentials: true,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken') || '',
                    },
                    body: data
                })
            )
        );
    }
}