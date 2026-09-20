import { Navigate } from "react-router-dom";


//{children} below — whatever page we wrap this around 
// (e.g. <Subjects />) gets passed in as children 
// and rendered normally, but only if the login check passes.


function ProtectedRoute ({children}){
    const isLoggedIn = !!localStorage.getItem("access_token");


    if (!isLoggedIn){
           

        //redirecting to /login of not not logged in
        // replace means it replaces the current entry 
        // in browser history instead of adding a new one — so 
        // clicking "back" won't just bounce you right back to 
        // the protected page you were just kicked out of.

        return <Navigate to = "/login" replace/>;   
    }

    return children;
}

export default ProtectedRoute;