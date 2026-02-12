-- Fix existing homes stuck in enriching/initializing state
UPDATE homes SET pulse_status = 'live' WHERE pulse_status IN ('enriching', 'initializing') AND created_at < NOW() - INTERVAL '5 minutes';