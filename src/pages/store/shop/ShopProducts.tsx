import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreStore } from '../useStoreStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package, Search, ImageIcon, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ProductMediaUpload, ProductMediaUploadRef } from '@/components/store/ProductMediaUpload';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    additional_images?: string[] | null;
    video_urls?: string[] | null;
    active: boolean | null;
    category_id: string | null;
    category?: Category | null; // Joined
    max_installments?: number | null;
    interest_rate?: number | null;
    installment_price?: number | null;
}

export default function ShopProducts() {
    const { currentStore } = useStoreStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const mediaUploadRef = useRef<ProductMediaUploadRef>(null);
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        installment_price: '',
        max_installments: '1',
        image_url: '',
        additional_images: [] as string[],
        video_urls: [] as string[],
        category_id: 'none',
        active: true
    });

    useEffect(() => {
        if (currentStore) {
            fetchCategories();
            fetchProducts();
        }
    }, [currentStore]);

    const fetchCategories = async () => {
        if (!currentStore) return;
        const { data } = await supabase
            .from('shop_categories')
            .select('id, name')
            .eq('store_id', currentStore.id)
            .order('name');
        setCategories(data || []);
    };

    const fetchProducts = async () => {
        if (!currentStore) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_products')
                .select(`
          *,
          category:shop_categories(id, name)
        `)
                .eq('store_id', currentStore.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data as any[] || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                price: (product.price ?? 0).toString(),
                installment_price: ((product.installment_price ?? product.price) ?? 0).toString(),
                max_installments: (product.max_installments || 1).toString(),
                image_url: product.image_url || '',
                additional_images: product.additional_images || [],
                video_urls: product.video_urls || [],
                category_id: product.category_id || 'none',
                active: !!product.active
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                installment_price: '',
                max_installments: '1',
                image_url: '',
                additional_images: [],
                video_urls: [],
                category_id: 'none',
                active: true
            });
        }
        setIsDialogOpen(true);
    };

    // Helper to get all images (main + additional)
    const getAllImages = () => {
        const images: string[] = [];
        if (formData.image_url) images.push(formData.image_url);
        images.push(...formData.additional_images);
        return images;
    };

    const handleImagesChange = (images: string[]) => {
        if (images.length > 0) {
            setFormData(prev => ({
                ...prev,
                image_url: images[0] || '',
                additional_images: images.slice(1)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                image_url: '',
                additional_images: []
            }));
        }
    };

    const handleSave = async () => {
        if (!currentStore) {
            toast.error('Loja não carregada');
            return;
        }

        if (!formData.name || !formData.price) {
            toast.error('Nome e Preço são obrigatórios');
            return;
        }

        try {
            // Upload pending files first
            let newImageUrls: string[] = [];
            let newVideoUrls: string[] = [];

            if (mediaUploadRef.current?.hasPendingFiles()) {
                toast.loading('Enviando arquivos...', { id: 'media-upload' });
                const uploaded = await mediaUploadRef.current.uploadPendingFiles();
                newImageUrls = uploaded.images;
                newVideoUrls = uploaded.videos;
                toast.dismiss('media-upload');
            }

            // Merge existing + newly uploaded
            const allImages = [...getAllImages(), ...newImageUrls];
            const allVideos = [...formData.video_urls, ...newVideoUrls];

            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price.replace(',', '.')) || 0,
                installment_price: parseFloat(formData.installment_price.replace(',', '.')) || parseFloat(formData.price.replace(',', '.')) || 0,
                max_installments: parseInt(formData.max_installments) || 1,
                interest_rate: 0,
                image_url: allImages[0] || '',
                additional_images: allImages.slice(1),
                video_urls: allVideos,
                category_id: formData.category_id === 'none' ? null : formData.category_id,
                active: formData.active,
                store_id: currentStore.id
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('shop_products')
                    .update(payload)
                    .eq('id', editingProduct.id);

                if (error) throw error;
                toast.success('Produto atualizado!');
            } else {
                const { error } = await supabase
                    .from('shop_products')
                    .insert(payload);

                if (error) throw error;
                toast.success('Produto criado!');
            }
            setIsDialogOpen(false);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Erro ao salvar produto');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase
                .from('shop_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Produto excluído');
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Erro ao excluir produto');
        }
    };

    const toggleActive = async (product: Product) => {
        try {
            const { error } = await supabase
                .from('shop_products')
                .update({ active: !product.active })
                .eq('id', product.id);

            if (error) throw error;
            setProducts(products.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
            toast.success(`Produto ${!product.active ? 'ativado' : 'desativado'}`);
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                <CardTitle className="text-lg font-medium">Produtos</CardTitle>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar produtos..."
                            className="pl-8 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button size="sm" onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Produto
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {filteredProducts.length === 0 && !loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="mx-auto h-12 w-12 mb-3 opacity-20" />
                        <p>Nenhum produto encontrado</p>
                    </div>
                ) : isMobile ? (
                    /* Mobile: Cards view */
                    <div className="space-y-3">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="flex items-center gap-3 p-3 bg-card border rounded-xl"
                            >
                                {/* Image */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted/50 flex-shrink-0">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={product.name}>{product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(product.category as any)?.name || 'Sem categoria'}
                                    </p>
                                    <p className="text-sm font-semibold text-primary">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => toggleActive(product)}
                                    >
                                        {product.active ? (
                                            <Eye className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-popover">
                                            <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(product.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Desktop: Table view */
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted/50 flex-shrink-0">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div>{product.name}</div>
                                            {product.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>}
                                        </TableCell>
                                        <TableCell>
                                            {(product.category as any)?.name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={!!product.active}
                                                onCheckedChange={() => toggleActive(product)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(product)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Form Content - shared between Dialog and Drawer */}
            {isMobile ? (
                <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DrawerContent className="max-h-[90vh]">
                        <DrawerHeader className="text-left">
                            <DrawerTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Produto</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: iPhone 13 Capa"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Preço À Vista</Label>
                                        <Input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Preço Parcelado</Label>
                                        <Input
                                            type="number"
                                            value={formData.installment_price}
                                            onChange={(e) => setFormData({ ...formData, installment_price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Parcelas</Label>
                                        <Select
                                            value={formData.max_installments}
                                            onValueChange={(val) => setFormData({ ...formData, max_installments: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="1x" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(num => (
                                                    <SelectItem key={num} value={num.toString()}>{num}x</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Categoria</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Categoria" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem categoria</SelectItem>
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <ProductMediaUpload
                                    ref={mediaUploadRef}
                                    images={getAllImages()}
                                    videos={formData.video_urls}
                                    onImagesChange={handleImagesChange}
                                    onVideosChange={(videos) => setFormData(prev => ({ ...prev, video_urls: videos }))}
                                />

                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Detalhes do produto..."
                                        className="resize-none"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="active-mobile"
                                        checked={formData.active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                    />
                                    <Label htmlFor="active-mobile">Produto visível na loja</Label>
                                </div>
                            </div>
                        </div>
                        <DrawerFooter className="pt-2">
                            <Button onClick={handleSave} className="w-full">Salvar</Button>
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full">Cancelar</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Produto</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: iPhone 13 Capa"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço À Vista (R$)</Label>
                                    <Input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Preço Parcelado Total (R$)</Label>
                                    <Input
                                        type="number"
                                        value={formData.installment_price}
                                        onChange={(e) => setFormData({ ...formData, installment_price: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Parcelas</Label>
                                    <Select
                                        value={formData.max_installments}
                                        onValueChange={(val) => setFormData({ ...formData, max_installments: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="1x" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(num => (
                                                <SelectItem key={num} value={num.toString()}>{num}x</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem categoria</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <ProductMediaUpload
                                ref={mediaUploadRef}
                                images={getAllImages()}
                                videos={formData.video_urls}
                                onImagesChange={handleImagesChange}
                                onVideosChange={(videos) => setFormData(prev => ({ ...prev, video_urls: videos }))}
                            />

                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detalhes do produto..."
                                    className="resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                />
                                <Label htmlFor="active">Produto visível na loja</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}
