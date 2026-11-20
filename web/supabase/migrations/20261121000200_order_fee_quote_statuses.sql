alter type public.order_status add value if not exists 'pending_fee_quote';
alter type public.order_status add value if not exists 'awaiting_customer_confirmation';
alter type public.order_status add value if not exists 'quote_accepted';
