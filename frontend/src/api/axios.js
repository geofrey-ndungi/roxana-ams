import axios from "axios";


// Instead of writing http://127.0.0.1:8000/api every time, axios.create will configure it.


const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api"
})

export default api;