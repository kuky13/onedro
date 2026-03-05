// @ts-nocheck
import React from 'react';
import { WormPdfConfig } from '@/components/worm/WormPdfConfig';
import { WormHeader } from '@/components/worm/WormHeader';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WormPdfConfigPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
            <WormHeader />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
                <div className="flex items-center gap-2 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/worm/config')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        {/* Title handled inside component or here if we want simplified breadcrumbs */}
                    </div>
                </div>
                <WormPdfConfig />
            </main>
        </div>
    );
};

export default WormPdfConfigPage;
