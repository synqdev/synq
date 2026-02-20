/**
 * System entity constants for admin booking operations.
 *
 * These IDs are used to create "block" bookings that prevent user bookings
 * during admin-blocked time slots. The block service is inactive (isActive: false)
 * so it is hidden from the public API.
 */

/** Sentinel customer ID for system-generated block bookings. */
export const SYSTEM_BLOCKER_ID = '00000000-0000-0000-0000-000000000000'

/** Service ID used for admin time-blocking bookings. */
export const BLOCK_SERVICE_ID = 'block-service'
