import { Counter, Rate, Trend } from "k6/metrics";

// Poll status counters
export const poll_200          = new Counter("poll_200_count");
export const poll_404          = new Counter("poll_404_count");
export const poll_410          = new Counter("poll_410_count");
export const poll_timeout      = new Counter("poll_timeout_count");
export const poll_network_error = new Counter("poll_network_error_count");
export const poll_other        = new Counter("poll_other_count");

// Job timing / polling efficiency
export const job_time_to_done_ms = new Trend("job_time_to_done_ms", true);
export const polls_per_job       = new Trend("polls_per_job", true);

// Rates (used in thresholds)
export const job_timeout_rate             = new Rate("job_timeout_rate");
export const poll_network_error_rate      = new Rate("poll_network_error_rate");
export const upload_failed_rate           = new Rate("upload_failed_rate");
export const delete_failed_rate           = new Rate("delete_failed_rate");
export const timeline_save_failed_rate    = new Rate("timeline_save_failed_rate");
export const timeline_update_failed_rate  = new Rate("timeline_update_failed_rate");
export const iteration_success_rate       = new Rate("iteration_success_rate");
