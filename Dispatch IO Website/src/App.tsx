import { useState } from 'react';
import { Bot, MessageSquare, Shield, Zap, ChevronRight, Server, Code, Sparkles, Settings, Music, Gift, Users, Menu, X, Github, Twitter, MessageCircle } from 'lucide-react';

function FlipCard({ icon, title, description, details }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div 
      className="relative h-[300px] group"
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ perspective: '1000px' }}
    >
      <div 
        className={`absolute w-full h-full transition-all duration-500 cursor-pointer`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        <div 
          className="absolute w-full h-full"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="p-6 rounded-2xl h-full bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-[#f40076] transition-all">
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400">{description}</p>
          </div>
        </div>
        
        <div 
          className="absolute w-full h-full"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="p-6 rounded-2xl h-full bg-gradient-to-br from-[#f40076]/20 to-black border border-[#f40076] transition-all">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <ul className="space-y-2 text-gray-300">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-[#f40076]" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ number, label, icon }: {
  number: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl bg-black/30 border border-gray-800 hover:border-[#f40076] transition-all">
      <div className="flex items-center justify-center gap-2 text-[#f40076] mb-2">
        {icon}
        <span className="text-3xl font-bold">{number}</span>
      </div>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}

function BenefitCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-6 rounded-2xl bg-black/30 border border-gray-800 hover:border-[#f40076] transition-all">
      <div className="text-[#f40076]">{icon}</div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-[#f40076]" />
              <span className="text-xl font-bold">Dispatch.IO</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setActivePage('home')}
                className={`text-sm hover:text-[#f40076] transition-colors ${activePage === 'home' ? 'text-[#f40076]' : 'text-gray-300'}`}
              >
                Accueil
              </button>
              <button 
                onClick={() => setActivePage('docs')}
                className={`text-sm hover:text-[#f40076] transition-colors ${activePage === 'docs' ? 'text-[#f40076]' : 'text-gray-300'}`}
              >
                Documentation
              </button>
              <button onClick={() => window.location.href = "https://discord.com/oauth2/authorize?client_id=1326262596705189929&permissions=8&integration_type=0&scope=bot"}  className="bg-[#f40076] hover:bg-[#d1005f] text-white px-4 py-2 rounded-full text-sm transition-all">
                Ajouter à Discord
              </button>
            </div>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => {
                  setActivePage('home');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-[#f40076]"
              >
                Accueil
              </button>
              <button 
                onClick={() => {
                  setActivePage('docs');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-[#f40076]"
              >
                Documentation
              </button>
              <button onClick={() => window.location.href = "https://discord.com/oauth2/authorize?client_id=1326262596705189929&permissions=8&integration_type=0&scope=bot"} className="block w-full px-3 py-2 text-base font-medium bg-[#f40076] hover:bg-[#d1005f] text-white rounded-full transition-all">
                Ajouter à Discord
              </button>
            </div>
          </div>
        )}
      </nav>

      {activePage === 'home' ? (
        <>
          <div className="relative overflow-hidden min-h-screen flex items-center pt-16">
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80"
                alt="Background"
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff]/50 via-black to-black opacity-90"></div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-32">
              <div className="text-center">
                <Bot className="w-24 h-24 mx-auto mb-8 text-[#ffffff] animate-pulse" />
                <h1 className="text-4xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#f40076] to-pink-400">
                  Dispatch.IO
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  Élevez votre serveur Discord vers de nouveaux sommets avec notre bot intelligent et puissant
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => window.location.href = "https://discord.com/oauth2/authorize?client_id=1326262596705189929&permissions=8&integration_type=0&scope=bot"} className="bg-[#f40076] hover:bg-[#d1005f] text-white font-bold py-4 px-8 rounded-full text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105">
                    Ajouter à Discord
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setActivePage('docs')}
                    className="bg-black/50 backdrop-blur border border-[#f40076] text-white font-bold py-4 px-8 rounded-full text-lg flex items-center justify-center gap-2 transition-all hover:bg-[#f40076]/20"
                  >
                    Documentation
                    <Code className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="py-24 bg-black/50 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
                Fonctionnalités <span className="text-[#f40076]">Exceptionnelles</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <FlipCard
                  icon={<MessageSquare className="w-8 h-8 text-[#f40076]" />}
                  title="Modération Avancée"
                  description="Gardez votre serveur sûr et organisé avec nos outils de modération intelligents et automatisés"
                  details={[
                    "Filtrage automatique des messages inappropriés",
                    "Système d'avertissements configurable",
                    "Logs détaillés des actions de modération",
                    "Anti-spam intelligent",
                    "Gestion des raids en temps réel"
                  ]}
                />
                <FlipCard
                  icon={<Zap className="w-8 h-8 text-[#f40076]" />}
                  title="Commandes Personnalisées"
                  description="Créez des commandes sur mesure pour répondre aux besoins spécifiques de votre communauté"
                  details={[
                    "Variables dynamiques",
                    "Réponses conditionnelles",
                    "Intégration avec des API externes",
                    "Système de permissions avancé"
                  ]}
                />
                <FlipCard
                  icon={<Shield className="w-8 h-8 text-[#f40076]" />}
                  title="Protection Anti-Raid"
                  description="Protégez votre serveur contre les raids et le spam avec notre système de sécurité avancé"
                  details={[
                    "Détection automatique des raids",
                    "Vérification des nouveaux membres",
                    "Mode urgence automatique"
                  ]}
                />
                <FlipCard
                  icon={<Music className="w-8 h-8 text-[#f40076]" />}
                  title="Système Musical"
                  description="Profitez d'une expérience musicale haute qualité avec notre lecteur intégré"
                  details={[
                    "Support multi-plateformes (YouTube, Spotify, SoundCloud)",
                    "Système de Radio",
                    "Recherche intelligente"
                  ]}
                />
                <FlipCard
                  icon={<Gift className="w-8 h-8 text-[#f40076]" />}
                  title="Système de Niveaux"
                  description="Encouragez l'engagement avec notre système de niveaux et de récompenses personnalisables"
                  details={[
                    "XP personnalisable par action",
                    "Rôles automatiques par niveau",
                    "Cartes de niveau personnalisables",
                    "Classements interactifs",
                    "Récompenses automatiques"
                  ]}
                />
                <FlipCard
                  icon={<Settings className="w-8 h-8 text-[#f40076]" />}
                  title="Configuration Facile"
                  description="Interface intuitive pour configurer le bot selon vos besoins spécifiques"
                  details={[
                    "/config et Web pour bientôt",
                    "Assistance en temps réel"
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="py-24 bg-gradient-to-b from-black to-[#f40076]/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
                Pourquoi Choisir <span className="text-[#f40076]">Dispatch.IO</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <BenefitCard
                    icon={<Sparkles className="w-6 h-6" />}
                    title="Performance Optimale"
                    description="Temps de réponse ultra-rapide et disponibilité 24/7"
                  />
                  <BenefitCard
                    icon={<Users className="w-6 h-6" />}
                    title="Support Communautaire"
                    description="Une équipe dédiée et une communauté active pour vous aider"
                  />
                </div>
                <div className="space-y-8 md:mt-12">
                  <BenefitCard
                    icon={<Code className="w-6 h-6" />}
                    title="Mises à jour régulières"
                    description="Nouvelles fonctionnalités et améliorations fréquentes"
                  />
                  <BenefitCard
                    icon={<Shield className="w-6 h-6" />}
                    title="Sécurité Maximale"
                    description="Protection avancée pour votre serveur et vos données"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="py-24 bg-black/80 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <StatCard number="3" label="Serveurs" icon={<Server className="w-6 h-6" />} />
                <StatCard number="2k+" label="Utilisateurs" icon={<Users className="w-6 h-6" />} />
                <StatCard number="100" label="Disponibilité" icon={<Zap className="w-6 h-6" />} />
                <StatCard number="43" label="Commandes" icon={<Code className="w-6 h-6" />} />
              </div>
            </div>
          </div>

          <div className="py-24 bg-gradient-to-t from-black to-[#f40076]/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Prêt à <span className="text-[#f40076]">Transformer</span> Votre Serveur?
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Rejoignez des milliers de serveurs qui font déjà confiance à Dispatch.IO pour améliorer leur communauté Discord
              </p>
              <button className="bg-[#f40076] hover:bg-[#d1005f] text-white font-bold py-4 px-8 rounded-full text-lg flex items-center gap-2 mx-auto transition-all transform hover:scale-105">
                Commencer Maintenant
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="pt-16 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-4xl font-bold mb-8">Documentation</h1>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-black/30 backdrop-blur p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-bold mb-4">Démarrage Rapide</h2>
                <ul className="space-y-2 text-gray-300">
                  <li>• Installation du bot</li>
                  <li>• Configuration initiale</li>
                  <li>• Commandes de base</li>
                  <li>• Permissions requises</li>
                </ul>
              </div>
              
              <div className="bg-black/30 backdrop-blur p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-bold mb-4">Guides</h2>
                <ul className="space-y-2 text-gray-300">
                  <li>• Configuration avancée</li>
                  <li>• Système de modération</li>
                  <li>• Gestion des niveaux</li>
                  <li>• Commandes personnalisées</li>
                </ul>
              </div>
              
              <div className="bg-black/30 backdrop-blur p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-bold mb-4">Référence API</h2>
                <ul className="space-y-2 text-gray-300">
                  <li>• Liste des commandes</li>
                  <li>• Webhooks</li>
                  <li>• Intégrations</li>
                  <li>• Limites et quotas</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 bg-black/30 backdrop-blur p-8 rounded-xl border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Installation Rapide</h2>
              <div className="space-y-4">
                <p className="text-gray-300">1. Invitez le bot sur votre serveur en cliquant sur le bouton "Ajouter à Discord"</p>
                <p className="text-gray-300">2. Configurez les permissions nécessaires</p>
                <p className="text-gray-300">3. Utilisez la commande <code className="bg-black/50 px-2 py-1 rounded">/setup</code> pour démarrer la configuration</p>
                <p className="text-gray-300">4. Personnalisez les paramètres selon vos besoins</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black/90 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Dispatch.IO</h3>
              <div className="flex items-center gap-2 text-[#f40076]">
                <Bot className="w-6 h-6" />
                <span className="text-white">v1.0.0</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Liens</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => setActivePage('home')} className="hover:text-[#f40076]">Accueil</button></li>
                <li><button onClick={() => setActivePage('docs')} className="hover:text-[#f40076]">Documentation</button></li>
                <li><a href="#" className="hover:text-[#f40076]">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-[#f40076]">FAQ</a></li>
                <li><a href="#" className="hover:text-[#f40076]">Contact</a></li>
                <li><a href="#" className="hover:text-[#f40076]">Serveur Discord</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Social</h3>
              <div className="flex gap-4">
                <a href="https://github.com/CorentinChopinDEV/Dispatch.IO" className="text-gray-400 hover:text-[#f40076]">
                  <Github className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#f40076]">
                  <MessageCircle className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© 2025 Dispatch.IO. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;