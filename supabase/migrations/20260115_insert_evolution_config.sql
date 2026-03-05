-- Insert initial Evolution API config
INSERT INTO public.evolution_config (api_url, global_api_key)
VALUES ('https://evo2.kuky.shop', 'm9vQk5G7fYw1rKcB3sR8XU0EJ2pLZ6dTnH4aCMeWq0I=')
ON CONFLICT DO NOTHING;
