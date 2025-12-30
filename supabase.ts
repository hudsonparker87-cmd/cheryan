
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vhufqhydoengrgbuyedu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWZxaHlkb2VuZ3JnYnV5ZWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDUzMDksImV4cCI6MjA4MTUyMTMwOX0.JJUYuuuHBhb7AkDCYUFqmydwNnMmaJsY7Dj8VOete1s";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
