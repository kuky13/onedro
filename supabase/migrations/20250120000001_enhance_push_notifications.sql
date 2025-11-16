-- Enhanced Push Notifications System Migration
-- This migration enhances the existing push notification infrastructure

-- Create push_notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.push_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    badge TEXT,
    image TEXT,
    data JSONB DEFAULT '{}',
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'user', 'role', 'group')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT,
    target_group TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    click_action TEXT,
    require_interaction BOOLEAN DEFAULT false,
    silent BOOLEAN DEFAULT false,
    vibrate INTEGER[] DEFAULT ARRAY[200, 100, 200],
    actions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Create push_notification_logs table for delivery tracking
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.user_push_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked', 'dismissed')),
    error_message TEXT,
    response_data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_target_type ON public.push_notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_target_user_id ON public.push_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_by ON public.push_notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON public.push_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_scheduled_at ON public.push_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_active ON public.push_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification_id ON public.push_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user_id ON public.push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status ON public.push_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_created_at ON public.push_notification_logs(created_at);

-- Add indexes to existing user_push_subscriptions table if not exists
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id ON public.user_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_active ON public.user_push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_created_at ON public.user_push_subscriptions(created_at);

-- Enable RLS on new tables
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_notifications table
CREATE POLICY "Admins can manage all push notifications" ON public.push_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view their own notifications" ON public.push_notifications
    FOR SELECT USING (
        target_type = 'user' AND target_user_id = auth.uid()
        OR target_type = 'all'
        OR (target_type = 'role' AND target_role IN (
            SELECT role FROM public.user_profiles WHERE id = auth.uid()
        ))
    );

-- RLS Policies for push_notification_logs table
CREATE POLICY "Admins can view all notification logs" ON public.push_notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view their own notification logs" ON public.push_notification_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notification logs" ON public.push_notification_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update notification logs" ON public.push_notification_logs
    FOR UPDATE USING (true);

-- Function to create a push notification (admin only)
CREATE OR REPLACE FUNCTION public.create_push_notification(
    p_title TEXT,
    p_body TEXT,
    p_target_type TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_target_role TEXT DEFAULT NULL,
    p_target_group TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL,
    p_badge TEXT DEFAULT NULL,
    p_image TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_priority INTEGER DEFAULT 1,
    p_click_action TEXT DEFAULT NULL,
    p_require_interaction BOOLEAN DEFAULT false,
    p_silent BOOLEAN DEFAULT false,
    p_vibrate INTEGER[] DEFAULT ARRAY[200, 100, 200],
    p_actions JSONB DEFAULT '[]',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_user_role TEXT;
BEGIN
    -- Check if user is admin
    SELECT role INTO v_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Validate target_type
    IF p_target_type NOT IN ('all', 'user', 'role', 'group') THEN
        RAISE EXCEPTION 'Invalid target_type. Must be one of: all, user, role, group';
    END IF;
    
    -- Validate required fields based on target_type
    IF p_target_type = 'user' AND p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id is required when target_type is user';
    END IF;
    
    IF p_target_type = 'role' AND p_target_role IS NULL THEN
        RAISE EXCEPTION 'target_role is required when target_type is role';
    END IF;
    
    IF p_target_type = 'group' AND p_target_group IS NULL THEN
        RAISE EXCEPTION 'target_group is required when target_type is group';
    END IF;
    
    -- Insert notification
    INSERT INTO public.push_notifications (
        title, body, icon, badge, image, data,
        target_type, target_user_id, target_role, target_group,
        created_by, scheduled_at, expires_at, priority,
        click_action, require_interaction, silent, vibrate, actions, metadata
    ) VALUES (
        p_title, p_body, p_icon, p_badge, p_image, p_data,
        p_target_type, p_target_user_id, p_target_role, p_target_group,
        auth.uid(), p_scheduled_at, p_expires_at, p_priority,
        p_click_action, p_require_interaction, p_silent, p_vibrate, p_actions, p_metadata
    ) RETURNING id INTO v_notification_id;
    
    -- Log the creation
    INSERT INTO public.admin_logs (
        admin_user_id, action, details, ip_address, user_agent
    ) VALUES (
        auth.uid(),
        'create_push_notification',
        jsonb_build_object(
            'notification_id', v_notification_id,
            'title', p_title,
            'target_type', p_target_type,
            'target_user_id', p_target_user_id,
            'target_role', p_target_role,
            'target_group', p_target_group
        ),
        inet_client_addr()::text,
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    RETURN v_notification_id;
END;
$$;

-- Function to get push notification statistics
CREATE OR REPLACE FUNCTION public.get_push_notification_stats(
    p_notification_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_notifications BIGINT,
    total_sent BIGINT,
    total_delivered BIGINT,
    total_clicked BIGINT,
    total_failed BIGINT,
    delivery_rate NUMERIC,
    click_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Check if user is admin
    SELECT role INTO v_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT pnl.notification_id)::BIGINT as total_notifications,
        COUNT(CASE WHEN pnl.status = 'sent' THEN 1 END)::BIGINT as total_sent,
        COUNT(CASE WHEN pnl.status = 'delivered' THEN 1 END)::BIGINT as total_delivered,
        COUNT(CASE WHEN pnl.status = 'clicked' THEN 1 END)::BIGINT as total_clicked,
        COUNT(CASE WHEN pnl.status = 'failed' THEN 1 END)::BIGINT as total_failed,
        CASE 
            WHEN COUNT(CASE WHEN pnl.status = 'sent' THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN pnl.status = 'delivered' THEN 1 END)::NUMERIC / 
                COUNT(CASE WHEN pnl.status = 'sent' THEN 1 END)::NUMERIC * 100, 2
            )
            ELSE 0
        END as delivery_rate,
        CASE 
            WHEN COUNT(CASE WHEN pnl.status = 'delivered' THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN pnl.status = 'clicked' THEN 1 END)::NUMERIC / 
                COUNT(CASE WHEN pnl.status = 'delivered' THEN 1 END)::NUMERIC * 100, 2
            )
            ELSE 0
        END as click_rate
    FROM public.push_notification_logs pnl
    JOIN public.push_notifications pn ON pnl.notification_id = pn.id
    WHERE 
        (p_notification_id IS NULL OR pnl.notification_id = p_notification_id)
        AND (p_start_date IS NULL OR pnl.created_at >= p_start_date)
        AND (p_end_date IS NULL OR pnl.created_at <= p_end_date);
END;
$$;

-- Function to cleanup old notification logs
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.push_notification_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- Function to update notification log status
CREATE OR REPLACE FUNCTION public.update_notification_log_status(
    p_log_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_response_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.push_notification_logs
    SET 
        status = p_status,
        error_message = p_error_message,
        response_data = p_response_data,
        updated_at = NOW(),
        sent_at = CASE WHEN p_status = 'sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END,
        delivered_at = CASE WHEN p_status = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
        clicked_at = CASE WHEN p_status = 'clicked' AND clicked_at IS NULL THEN NOW() ELSE clicked_at END,
        dismissed_at = CASE WHEN p_status = 'dismissed' AND dismissed_at IS NULL THEN NOW() ELSE dismissed_at END
    WHERE id = p_log_id;
    
    RETURN FOUND;
END;
$$;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_notification_logs_updated_at
    BEFORE UPDATE ON public.push_notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.push_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_notification_log_status TO authenticated;

-- Migration completed successfully
-- Enhanced push notifications system with tracking and analytics