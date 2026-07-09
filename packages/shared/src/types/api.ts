// Uniform error envelope for every non-2xx API response, so the frontend has one
// place (an http client interceptor) to unwrap errors instead of per-endpoint parsing.
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
