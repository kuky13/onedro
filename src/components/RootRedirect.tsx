 import { Navigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 
 export const RootRedirect = () => {
   const { user, loading } = useAuth();
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
       </div>
     );
   }
 
   if (user) {
     return <Navigate to="/dashboard" replace />;
   }
 
   return <Navigate to="/landing" replace />;
 };