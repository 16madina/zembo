-- Insert default questions by category (table already exists with new structure)
INSERT INTO public.compatibility_questions (question, category, options, display_order) VALUES
-- Amour & Relation
('Tu cherches :', 'amour', '["💘 Sérieux", "🔥 Fun", "👋 Amis", "🎲 On verra"]', 1),
('En amour, tu es plutôt :', 'amour', '["❤️ Romantique", "😏 Passionné(e)", "🧊 Réservé(e)", "🎭 Mystérieux(se)"]', 2),

-- Mentalité
('Tu préfères :', 'mentalite', '["🏗️ Construire à deux", "⚡ Vivre l''instant", "🦅 Indépendance avant tout", "🎯 Un peu des trois"]', 3),
('Face aux problèmes :', 'mentalite', '["🗣️ J''en parle direct", "🧠 Je réfléchis seul(e)", "⏰ Je laisse passer", "🤝 Je cherche un compromis"]', 4),

-- Lifestyle
('Soirée idéale :', 'lifestyle', '["🎬 Netflix & chill", "🍽️ Sortie resto", "✈️ Voyage improvisé", "🎉 Fête"]', 5),
('Le week-end parfait :', 'lifestyle', '["🏠 Cocooning à la maison", "🌳 Nature & aventure", "🎭 Sorties culturelles", "👥 Entre amis"]', 6),
('Vacances de rêve :', 'lifestyle', '["🏖️ Plage & farniente", "🏔️ Montagne & sport", "🏙️ City trip", "🌍 Road trip"]', 7),

-- Valeurs
('Le plus important pour toi :', 'valeurs', '["🙏 Respect", "💎 Loyauté", "🚀 Ambition", "💬 Communication"]', 8),
('En couple, tu valorises :', 'valeurs', '["🤝 La confiance", "🔥 La passion", "😂 L''humour", "🎯 Les projets communs"]', 9),
('Ta devise :', 'valeurs', '["💪 Qui veut peut", "❤️ L''amour avant tout", "🌟 Carpe diem", "🧘 Patience est mère de vertu"]', 10),

-- Personnalité
('Tu te décris plutôt comme :', 'personnalite', '["😌 Calme", "🔥 Passionné(e)", "😂 Drôle", "💼 Ambitieux(se)"]', 11),
('En société, tu es :', 'personnalite', '["🦋 Extraverti(e)", "🐢 Introverti(e)", "🎭 Ça dépend", "👀 Observateur(trice)"]', 12),
('Ton énergie :', 'personnalite', '["☀️ Solaire", "🌙 Mystérieuse", "⚡ Électrique", "🌊 Apaisante"]', 13),

-- Bonus fun
('Emoji qui te représente :', 'fun', '["😎", "🥰", "🔥", "✨"]', 14),
('Red flag absolu :', 'fun', '["🚫 Mensonge", "📵 Ghosting", "😤 Jalousie", "🙄 Égoïsme"]', 15)
ON CONFLICT DO NOTHING;