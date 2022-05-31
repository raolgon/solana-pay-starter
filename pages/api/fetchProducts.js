import products from "./products.json";

export default function handler(req, res){
    if(req.method === "GET"){
        const productNoHashes = products.map(product => {
            const {hash, filename, ...rest} = product;
            return rest;
        });

        res.status(200).json(productNoHashes);
    } else {
        res.status(405).json({message: `Method ${req.method} not allowed`});
    }
}