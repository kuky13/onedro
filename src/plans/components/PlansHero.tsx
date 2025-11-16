import React from 'react';

interface PlansHeroProps {
  pageTitle: string;
  pageSubtitle: string;
}

const PlansHero: React.FC<PlansHeroProps> = ({ pageTitle, pageSubtitle }) => {

  return (
    <section className="relative py-20 px-4 text-center">
      {/* Logo */}
      <div className="mb-8 animate-fade-in-up">
        <img 
          src="https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=Modern%20minimalist%20logo%20with%20water%20droplet%20and%20text%20%22OneDrip%22%20in%20elegant%20typography%2C%20blue%20gradient%20colors%2C%20clean%20design%2C%20professional%20branding&image_size=square" 
          alt="OneDrip Logo" 
          className="h-16 mx-auto"
        />
      </div>
      
      {/* Título e Subtítulo */}
      <div className="max-w-4xl mx-auto animate-fade-in-up animation-delay-200">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          {pageTitle}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {pageSubtitle}
        </p>
      </div>
    </section>
  );
};

export default PlansHero;