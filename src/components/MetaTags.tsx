import React from 'react';
import { useDynamicMetaTags } from '@/hooks/useDynamicMetaTags';

interface MetaTagsProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export const MetaTags: React.FC<MetaTagsProps> = (props) => {
  const { applyMetaTags } = useDynamicMetaTags();

  React.useEffect(() => {
    if (Object.keys(props).length > 0) {
      applyMetaTags(props);
    }
  }, [props, applyMetaTags]);

  return null; // Este componente não renderiza nada visualmente
};

export default MetaTags;