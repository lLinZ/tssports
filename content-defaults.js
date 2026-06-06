/* =====================================================================
   CONTENIDO POR DEFECTO — Fuente única de verdad de la página.
   El panel (admin.html) edita una copia de este objeto y la guarda
   en Supabase. La web pública lo carga y lo pinta.
   Si Supabase no está configurado todavía, se usa esto tal cual.
   ===================================================================== */
window.TS_DEFAULTS = {
  // --- Colores (se aplican como variables CSS) ---
  colors: {
    navy: "#0a1f3c",     // azul oscuro (fondos hero/footer)
    navy2: "#0d2b52",    // azul secundario
    accent: "#1b9aaa",   // color principal / botones
    accent2: "#16c79a",  // acento verde
    bgAlt: "#f5f7fa"     // fondo de secciones alternas
  },

  // --- Imágenes (URL; si está vacío se usa el degradado por defecto) ---
  images: {
    hero: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1920&q=80",   // estadio lleno (respaldo / poster del video)
    heroVideo: "https://videos.pexels.com/video-files/3192198/3192198-hd_1920_1080_25fps.mp4",                // video de fondo del hero (mp4 en bucle)
    about: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1100&q=80",   // entrenamiento / estrategia
    cta: "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1920&q=80"      // afición / emoción
  },

  // --- Contacto ---
  contact: {
    email: "info@tssports.com",
    whatsapp: "+57 320 4325231",
    instagram: "#",
    linkedin: "#"
  },

  // --- Textos fijos en los dos idiomas ---
  texts: {
    es: {
      "nav.about": "Nosotros",
      "nav.team": "Equipo",
      "nav.services": "Servicios",
      "nav.projects": "Proyectos",
      "nav.clients": "Aliados",
      "nav.contact": "Contacto",
      "hero.eyebrow": "CONSULTORÍA ESTRATÉGICA DEPORTIVA",
      "hero.title": "El deporte es nuestra pasión.<br />La innovación, nuestro talento.",
      "hero.sub": "Diseñamos y ejecutamos estrategias de marketing, patrocinios y eventos que conectan marcas con la emoción del deporte.",
      "hero.expertPrefix": "Expertos en",
      "hero.rotators": "Marketing,Patrocinios,Eventos,eSports,Derechos de medios",
      "hero.cta1": "Nuestros servicios",
      "hero.cta2": "Hablemos",
      "stats.years": "Años de experiencia",
      "stats.brands": "Marcas aliadas",
      "stats.areas": "Áreas de servicio",
      "stats.passion": "Pasión por el deporte",
      "stat.n1": "20+", "stat.n2": "17+", "stat.n3": "6", "stat.n4": "100%",
      "about.eyebrow": "QUIÉNES SOMOS",
      "about.title": "Más de 20 años convirtiendo el deporte en oportunidades de negocio",
      "about.p1": "Somos una agencia independiente de consultoría estratégica. Nuestro equipo multidisciplinario combina experiencia en educación, ventas, marketing, comunicación y medios para crear soluciones a la medida.",
      "about.p2": "Acompañamos a marcas, ligas, clubes y propiedades deportivas en cada etapa: desde la estrategia y la activación, hasta la medición de resultados. Innovación, datos y creatividad en cada proyecto.",
      "about.v1t": "Estrategia", "about.v1d": "Planes basados en datos y objetivos claros.",
      "about.v2t": "Creatividad", "about.v2d": "Ideas que generan conversación y comunidad.",
      "about.v3t": "Ejecución", "about.v3d": "Operación impecable de principio a fin.",
      "about.v4t": "Resultados", "about.v4d": "Medición de ROI y mejora continua.",
      "team.eyebrow": "NUESTRO EQUIPO",
      "team.title": "Las personas detrás de TS Sports",
      "team.joinTitle": "¿Te gustaría unirte al equipo?",
      "team.joinText": "Envíanos tu información junto con tu CV.",
      "team.joinCta": "Escríbenos",
      "serv.eyebrow": "NUESTROS SERVICIOS",
      "serv.title": "Soluciones integrales para el negocio del deporte",
      "band.title": "Convertimos la pasión por el deporte en resultados de negocio",
      "band.text": "Estrategia, creatividad y ejecución para marcas que quieren jugar en las grandes ligas.",
      "band.cta": "Comencemos",
      "proj.eyebrow": "NUESTRO TRABAJO",
      "proj.title": "Proyectos que dejan huella",
      "proj.quote": "“Un equipo que entiende el negocio del deporte y lo ejecuta con pasión. Resultados claros y una relación de confianza.”",
      "proj.quoteby": "— Dirección, organización deportiva aliada",
      "ally.eyebrow": "NUESTROS ALIADOS",
      "ally.title": "Marcas que confían en nosotros",
      "contact.eyebrow": "CONTACTO",
      "contact.title": "¿Listo para llevar tu marca al siguiente nivel?",
      "contact.p1": "Cuéntanos sobre tu proyecto y diseñaremos una estrategia a tu medida.",
      "contact.email": "Email",
      "contact.social": "Redes",
      "contact.wa": "Escríbenos por WhatsApp",
      "wa.eyebrow": "RESPUESTA RÁPIDA",
      "wa.title": "¿Prefieres hablar directo?",
      "wa.text": "Escríbenos por WhatsApp y te asesoramos al instante, sin compromiso.",
      "form.name": "Nombre",
      "form.email": "Email",
      "form.message": "Mensaje",
      "form.send": "Enviar por WhatsApp",
      "footer.tag": "Marketing & consultoría deportiva.",
      "footer.rights": "Todos los derechos reservados."
    },
    en: {
      "nav.about": "About",
      "nav.team": "Team",
      "nav.services": "Services",
      "nav.projects": "Projects",
      "nav.clients": "Partners",
      "nav.contact": "Contact",
      "hero.eyebrow": "STRATEGIC SPORTS CONSULTING",
      "hero.title": "Sport is our passion.<br />Innovation is our talent.",
      "hero.sub": "We design and deliver marketing, sponsorship and event strategies that connect brands with the emotion of sport.",
      "hero.expertPrefix": "Experts in",
      "hero.rotators": "Marketing,Sponsorships,Events,eSports,Media rights",
      "hero.cta1": "Our services",
      "hero.cta2": "Let's talk",
      "stats.years": "Years of experience",
      "stats.brands": "Partner brands",
      "stats.areas": "Service areas",
      "stats.passion": "Passion for sport",
      "stat.n1": "20+", "stat.n2": "17+", "stat.n3": "6", "stat.n4": "100%",
      "about.eyebrow": "WHO WE ARE",
      "about.title": "20+ years turning sport into business opportunities",
      "about.p1": "We are an independent strategic consulting agency. Our multidisciplinary team blends expertise in education, sales, marketing, communications and media to craft tailor-made solutions.",
      "about.p2": "We support brands, leagues, clubs and sports properties at every stage: from strategy and activation to results measurement. Innovation, data and creativity in every project.",
      "about.v1t": "Strategy", "about.v1d": "Plans built on data and clear objectives.",
      "about.v2t": "Creativity", "about.v2d": "Ideas that spark conversation and community.",
      "about.v3t": "Execution", "about.v3d": "Flawless operations from start to finish.",
      "about.v4t": "Results", "about.v4d": "ROI measurement and continuous improvement.",
      "team.eyebrow": "OUR TEAM",
      "team.title": "The people behind TS Sports",
      "team.joinTitle": "Would you like to join the team?",
      "team.joinText": "Send us your details along with your resume.",
      "team.joinCta": "Write us",
      "serv.eyebrow": "OUR SERVICES",
      "serv.title": "End-to-end solutions for the business of sport",
      "band.title": "We turn passion for sport into business results",
      "band.text": "Strategy, creativity and execution for brands that want to play in the big leagues.",
      "band.cta": "Let's start",
      "proj.eyebrow": "OUR WORK",
      "proj.title": "Projects that leave a mark",
      "proj.quote": "“A team that understands the business of sport and delivers it with passion. Clear results and a relationship built on trust.”",
      "proj.quoteby": "— Management, partner sports organization",
      "ally.eyebrow": "OUR PARTNERS",
      "ally.title": "Brands that trust us",
      "contact.eyebrow": "CONTACT",
      "contact.title": "Ready to take your brand to the next level?",
      "contact.p1": "Tell us about your project and we'll design a strategy tailored to you.",
      "contact.email": "Email",
      "contact.social": "Social",
      "contact.wa": "Message us on WhatsApp",
      "wa.eyebrow": "QUICK REPLY",
      "wa.title": "Prefer to talk directly?",
      "wa.text": "Message us on WhatsApp and we'll help you right away, no strings attached.",
      "form.name": "Name",
      "form.email": "Email",
      "form.message": "Message",
      "form.send": "Send via WhatsApp",
      "footer.tag": "Sports marketing & consulting.",
      "footer.rights": "All rights reserved."
    }
  },

  // --- Servicios (tarjetas dinámicas) ---
  services: [
    { icon: "✦", es: { title: "Contenido & Estrategia", desc: "Planificación, estrategia creativa, brand content y storytelling para conectar con tu audiencia." }, en: { title: "Content & Strategy", desc: "Planning, creative strategy, brand content and storytelling to connect with your audience." } },
    { icon: "◈", es: { title: "Digital & Social Media", desc: "Desarrollo web, gestión de redes sociales y sistemas CRM para impulsar tu presencia digital." }, en: { title: "Digital & Social Media", desc: "Web development, social media management and CRM systems to boost your digital presence." } },
    { icon: "◆", es: { title: "Eventos & Proyectos", desc: "Valoración, negociación, gestión de proyectos y producción de eventos deportivos." }, en: { title: "Events & Projects", desc: "Valuation, negotiation, project management and production of sports events." } },
    { icon: "▲", es: { title: "eSports", desc: "Planificación, activación de patrocinios y consultoría de marca en el ecosistema de eSports." }, en: { title: "eSports", desc: "Planning, sponsorship activation and brand consulting within the eSports ecosystem." } },
    { icon: "●", es: { title: "Derechos de Medios", desc: "Consultoría de derechos, estrategia de valoración y orientación de inversión." }, en: { title: "Media Rights", desc: "Rights consulting, valuation strategy and investment guidance." } },
    { icon: "■", es: { title: "Gestión de Patrocinios", desc: "Gestión de portafolio, valoración de propiedades, análisis de activación y medición de ROI." }, en: { title: "Sponsorship Management", desc: "Portfolio management, property valuation, activation analysis and ROI measurement." } }
  ],

  // --- Proyectos (tarjetas dinámicas) ---
  // image: URL (si está vacío se usa el degradado 'gradient')
  projects: [
    { image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80", gradient: "linear-gradient(135deg,#0d3b66,#1b6ca8)", es: { tag: "Liga deportiva", title: "Activación de Liga", desc: "Estrategia integral de patrocinios y contenido para una temporada completa." }, en: { tag: "Sports league", title: "League Activation", desc: "Comprehensive sponsorship and content strategy for a full season." } },
    { image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80", gradient: "linear-gradient(135deg,#b91c1c,#f97316)", es: { tag: "Brand Building", title: "Construcción de Marca", desc: "Posicionamiento y narrativa para una marca deportiva emergente." }, en: { tag: "Brand Building", title: "Brand Building", desc: "Positioning and narrative for an emerging sports brand." } },
    { image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=800&q=80", gradient: "linear-gradient(135deg,#166534,#22c55e)", es: { tag: "Evento", title: "Producción de Evento", desc: "Organización end-to-end de un torneo con cobertura multiplataforma." }, en: { tag: "Event", title: "Event Production", desc: "End-to-end organization of a tournament with multi-platform coverage." } }
  ],

  // --- Equipo (personas). photo: URL; role bilingüe ---
  team: [
    { name: "Carlos Méndez", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&h=500&q=75", es: { role: "Director General" }, en: { role: "Managing Director" } },
    { name: "Ana Rodríguez", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&h=500&q=75", es: { role: "Directora de Estrategia" }, en: { role: "Strategy Director" } },
    { name: "Diego Torres", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&h=500&q=75", es: { role: "Líder de Patrocinios" }, en: { role: "Sponsorship Lead" } },
    { name: "Valentina Ruiz", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&h=500&q=75", es: { role: "Directora de Contenido" }, en: { role: "Content Director" } }
  ],

  // --- Aliados (logos). logo: URL de imagen; si está vacío, se muestra 'name' como texto ---
  allies: [
    { name: "Atlético", logo: "" },
    { name: "Pepsi", logo: "" },
    { name: "Copa Air", logo: "" },
    { name: "LVBP", logo: "" },
    { name: "FVF", logo: "" },
    { name: "Gatorade", logo: "" },
    { name: "Movistar", logo: "" },
    { name: "Nike", logo: "" },
    { name: "Coca-Cola", logo: "" },
    { name: "Banco", logo: "" },
    { name: "Polar", logo: "" },
    { name: "+ más", logo: "" }
  ]
};
