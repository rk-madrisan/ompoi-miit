-- Create agent_assignments table for tracking agent work
CREATE TABLE public.agent_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_location JSONB,
  notes TEXT,
  quality_check_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for agent assignments
CREATE POLICY "Agents can view their assignments" 
ON public.agent_assignments 
FOR SELECT 
USING (agent_id = auth.uid());

CREATE POLICY "Agents can update their assignments" 
ON public.agent_assignments 
FOR UPDATE 
USING (agent_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" 
ON public.agent_assignments 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Order participants can view assignments" 
ON public.agent_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = agent_assignments.order_id 
  AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
));

-- Create trigger for updated_at
CREATE TRIGGER update_agent_assignments_updated_at
BEFORE UPDATE ON public.agent_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add agent role if not exists in business_role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_role') THEN
        CREATE TYPE public.business_role AS ENUM ('admin', 'seller', 'buyer', 'agent');
    ELSE
        -- Check if 'agent' value exists, if not add it
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'business_role' AND e.enumlabel = 'agent') THEN
            ALTER TYPE public.business_role ADD VALUE 'agent';
        END IF;
    END IF;
END $$;

-- Update orders table to include agent assignment status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'unassigned';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON public.agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_status ON public.agent_assignments(status);
CREATE INDEX IF NOT EXISTS idx_orders_agent_status ON public.orders(agent_status);