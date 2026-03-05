import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShopProducts from './shop/ShopProducts';
import ShopCategories from './shop/ShopCategories';

export default function StoreShop() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Minha Loja</h2>
                <p className="text-muted-foreground">Gerencie seus produtos e categorias para venda direta</p>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="products">Produtos</TabsTrigger>
                    <TabsTrigger value="categories">Categorias</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="mt-6">
                    <ShopProducts />
                </TabsContent>
                <TabsContent value="categories" className="mt-6">
                    <ShopCategories />
                </TabsContent>
            </Tabs>
        </div>
    );
}
