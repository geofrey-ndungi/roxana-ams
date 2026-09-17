import axios from "axios";


// Instead of writing http://127.0.0.1:8000/api every time, axios.create will configure it.


const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api"
});




// This runs automatically before every request sent through `api`.
// It grabs the JWT access token saved in localStorage (set during login)
// and attaches it as an Authorization header, so we don't have to
// manually add the token in every component that makes an API call.
api.interceptors.request.use((config) => {

    const token = localStorage.getItem("access_token");
    if (token){
        config.headers.Authorization = 'Bearer ${token}';
    }
    return config;
})


export default api;