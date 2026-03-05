export async function searchClients(supabase: any, userId: string, searchTerm: string) {
  try {
    // Extrair palavras-chave da busca (remover artigos e preposições comuns)
    const cleanTerm = searchTerm
      .toLowerCase()
      .replace(/\b(o|a|os|as|de|da|do|das|dos|sobre|cliente|contato)\b/gi, '')
      .trim();
    
    // Dividir em palavras para busca mais inteligente
    const words = cleanTerm.split(/\s+/).filter(w => w.length > 2);
    
    if (words.length === 0) {
      return getAllClients(supabase, userId);
    }

    // Buscar por cada palavra individualmente para maior flexibilidade
    const searchConditions = words.map(word => 
      `name.ilike.%${word}%,phone.ilike.%${word}%,email.ilike.%${word}%`
    ).join(',');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .or(searchConditions)
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;
    
    // Ordenar resultados por relevância (mais palavras encontradas = mais relevante)
    const scored = (data || []).map((client: any) => {
      const clientText = `${client.name} ${client.phone} ${client.email}`.toLowerCase();
      const score = words.reduce((acc, word) => 
        clientText.includes(word) ? acc + 1 : acc, 0
      );
      return { ...client, _score: score };
    });
    
    return scored
      .filter((c: any) => c._score > 0)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error searching clients:', error);
    return [];
  }
}

export async function getAllClients(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all clients:', error);
    return [];
  }
}

export function formatClientsForAI(clients: any[]): string {
  if (!clients || clients.length === 0) {
    return 'NO_DATA_FOUND: Nenhum cliente encontrado';
  }

  let result = `📋 **CLIENTES ENCONTRADOS (${clients.length})**\n\n`;

  clients.forEach((client, index) => {
    result += `${index + 1}. **${client.name}**\n`;
    result += `   📞 Telefone: ${client.phone || 'Não informado'}\n`;
    
    if (client.email) {
      result += `   📧 Email: ${client.email}\n`;
    }
    
    if (client.address) {
      result += `   📍 Endereço: ${client.address}\n`;
    }
    
    if (client.city || client.state) {
      result += `   🏙️ Localização: ${client.city || ''}${client.city && client.state ? ', ' : ''}${client.state || ''}\n`;
    }
    
    if (client.zip_code) {
      result += `   📮 CEP: ${client.zip_code}\n`;
    }
    
    if (client.notes) {
      result += `   📝 Observações: ${client.notes}\n`;
    }
    
    if (client.tags && client.tags.length > 0) {
      result += `   🏷️ Tags: ${client.tags.join(', ')}\n`;
    }
    
    if (client.is_favorite) {
      result += `   ⭐ Cliente favorito\n`;
    }
    
    result += `   📅 Cadastrado em: ${new Date(client.created_at).toLocaleDateString('pt-BR')}\n`;
    result += '\n';
  });

  return result;
}
