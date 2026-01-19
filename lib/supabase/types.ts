export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    display_name: string;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    display_name: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    display_name?: string;
                    created_at?: string;
                };
            };
            trips: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    start_date: string | null;
                    end_date: string | null;
                    destinations: string[] | null;
                    invite_code: string | null;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    destinations?: string[] | null;
                    invite_code?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    destinations?: string[] | null;
                    invite_code?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                };
            };
            trip_members: {
                Row: {
                    id: string;
                    trip_id: string;
                    user_id: string | null;
                    role: string;
                    joined_at: string;
                    display_name_override: string | null;
                    invite_token: string | null;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    user_id?: string | null;
                    role?: string;
                    joined_at?: string;
                    display_name_override?: string | null;
                    invite_token?: string | null;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    user_id?: string | null;
                    role?: string;
                    joined_at?: string;
                    display_name_override?: string | null;
                    invite_token?: string | null;
                };
            };
            itinerary_items: {
                Row: {
                    id: string;
                    trip_id: string;
                    type: string;
                    title: string;
                    date: string | null;
                    start_time: string | null;
                    start_timezone: string | null;
                    end_time: string | null;
                    end_timezone: string | null;
                    timezone: string | null;
                    location: string | null;
                    address: string | null;
                    notes: string | null;
                    airline: string | null;
                    flight_number: string | null;
                    departure_airport: string | null;
                    arrival_airport: string | null;
                    departure_time: string | null;
                    arrival_time: string | null;
                    confirmation_number: string | null;
                    check_in_date: string | null;
                    check_out_date: string | null;
                    is_ai_generated: boolean;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    type: string;
                    title: string;
                    date?: string | null;
                    start_time?: string | null;
                    end_time?: string | null;
                    timezone?: string | null;
                    location?: string | null;
                    address?: string | null;
                    notes?: string | null;
                    airline?: string | null;
                    flight_number?: string | null;
                    departure_airport?: string | null;
                    arrival_airport?: string | null;
                    departure_time?: string | null;
                    arrival_time?: string | null;
                    confirmation_number?: string | null;
                    check_in_date?: string | null;
                    check_out_date?: string | null;
                    is_ai_generated?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    type?: string;
                    title?: string;
                    date?: string | null;
                    start_time?: string | null;
                    end_time?: string | null;
                    timezone?: string | null;
                    location?: string | null;
                    address?: string | null;
                    notes?: string | null;
                    airline?: string | null;
                    flight_number?: string | null;
                    departure_airport?: string | null;
                    arrival_airport?: string | null;
                    departure_time?: string | null;
                    arrival_time?: string | null;
                    confirmation_number?: string | null;
                    check_in_date?: string | null;
                    check_out_date?: string | null;
                    is_ai_generated?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            places: {
                Row: {
                    id: string;
                    trip_id: string;
                    name: string;
                    address: string | null;
                    category: string | null;
                    notes: string | null;
                    status: string;
                    visit_date: string | null;
                    visit_time: string | null;
                    end_time: string | null;
                    ticket_info: string | null;
                    ticket_url: string | null;
                    price: number | null;
                    price_currency: string;
                    is_added_to_itinerary: boolean;
                    is_ai_generated: boolean;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    name: string;
                    address?: string | null;
                    category?: string | null;
                    notes?: string | null;
                    status?: string;
                    visit_date?: string | null;
                    visit_time?: string | null;
                    end_time?: string | null;
                    ticket_info?: string | null;
                    ticket_url?: string | null;
                    price?: number | null;
                    price_currency?: string;
                    is_added_to_itinerary?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    name?: string;
                    address?: string | null;
                    category?: string | null;
                    notes?: string | null;
                    status?: string;
                    visit_date?: string | null;
                    visit_time?: string | null;
                    end_time?: string | null;
                    ticket_info?: string | null;
                    ticket_url?: string | null;
                    price?: number | null;
                    price_currency?: string;
                    is_added_to_itinerary?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                };
            };
            trip_todos: {
                Row: {
                    id: string;
                    trip_id: string;
                    title: string;
                    is_completed: boolean;
                    assigned_to: string[] | null;
                    completed_by: string[];
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    title: string;
                    is_completed?: boolean;
                    assigned_to?: string[] | null;
                    completed_by?: string[];
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    title?: string;
                    is_completed?: boolean;
                    assigned_to?: string[] | null;
                    completed_by?: string[];
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            },
            trip_memos: {
                Row: {
                    id: string;
                    trip_id: string;
                    title: string;
                    content: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    title: string;
                    content?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    title?: string;
                    content?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            },
            expenses: {
                Row: {
                    id: string;
                    trip_id: string;
                    amount: number;
                    currency: string;
                    amount_jpy: number | null;
                    exchange_rate: number | null;
                    category: string | null;
                    description: string | null;
                    paid_by: string | null;
                    date: string | null;
                    is_settled: boolean;
                    is_ai_generated: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    amount: number;
                    currency?: string;
                    amount_jpy?: number | null;
                    exchange_rate?: number | null;
                    category?: string | null;
                    description?: string | null;
                    paid_by?: string | null;
                    date?: string | null;
                    is_settled?: boolean;
                    is_ai_generated?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    amount?: number;
                    currency?: string;
                    amount_jpy?: number | null;
                    exchange_rate?: number | null;
                    category?: string | null;
                    description?: string | null;
                    paid_by?: string | null;
                    date?: string | null;
                    is_settled?: boolean;
                    is_ai_generated?: boolean;
                    created_at?: string;
                };
            };
            expense_splits: {
                Row: {
                    id: string;
                    expense_id: string;
                    user_id: string;
                };
                Insert: {
                    id?: string;
                    expense_id: string;
                    user_id: string;
                };
                Update: {
                    id?: string;
                    expense_id?: string;
                    user_id?: string;
                };
            };
            exchange_rates: {
                Row: {
                    id: string;
                    trip_id: string;
                    from_currency: string;
                    to_currency: string;
                    rate: number;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    from_currency: string;
                    to_currency?: string;
                    rate: number;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    from_currency?: string;
                    to_currency?: string;
                    rate?: number;
                    updated_at?: string;
                };
            };
            chat_messages: {
                Row: {
                    id: string;
                    trip_id: string;
                    user_id: string | null;
                    role: string;
                    content: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    user_id?: string | null;
                    role: string;
                    content: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    user_id?: string | null;
                    role?: string;
                    content?: string;
                    created_at?: string;
                };
            };
        };
    };
}
