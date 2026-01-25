-- Add RLS policies for admins to manage truth_or_dare_challenges
CREATE POLICY "Admins can view all challenges"
ON public.truth_or_dare_challenges
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert challenges"
ON public.truth_or_dare_challenges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update challenges"
ON public.truth_or_dare_challenges
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete challenges"
ON public.truth_or_dare_challenges
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));