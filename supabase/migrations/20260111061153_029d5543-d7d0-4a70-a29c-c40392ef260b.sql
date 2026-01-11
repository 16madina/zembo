
-- Add RLS policies for admins to manage user subscriptions
CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policies for admins to manage user coins
CREATE POLICY "Admins can view all coins" 
ON public.user_coins 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coins" 
ON public.user_coins 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all coins" 
ON public.user_coins 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));
