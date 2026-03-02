export interface Product {
  id: number
  name: string
  price: number
  category: string
  image: string
  rating: number
  badge?: string
  sizes: string[]
}

export const products: Product[] = [
  {
    id: 1,
    name: "NC United Classic T-Shirt",
    price: 24.99,
    category: "t-shirts",
    image: "/navy-blue-athletic-t-shirt.jpg",
    rating: 5,
    badge: "Best Seller",
    sizes: ["YS", "YM", "YL", "S", "M", "L", "XL", "XXL"],
  },
  {
    id: 2,
    name: "Wrestling State Pride Hoodie",
    price: 49.99,
    category: "hoodies",
    image: "/navy-blue-hoodie-wrestling.jpg",
    rating: 5,
    badge: "New",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 3,
    name: "Performance Training Tee",
    price: 29.99,
    category: "athletic-wear",
    image: "/red-athletic-performance-shirt.jpg",
    rating: 4,
    sizes: ["YM", "YL", "S", "M", "L", "XL"],
  },
  {
    id: 4,
    name: "NC United Snapback Hat",
    price: 24.99,
    category: "headwear",
    image: "/navy-blue-snapback-hat.jpg",
    rating: 5,
    sizes: ["S", "M", "L"],
  },
  {
    id: 5,
    name: "Wrestling Mom Shirt",
    price: 26.99,
    category: "t-shirts",
    image: "/white-t-shirt-wrestling-mom.jpg",
    rating: 5,
    badge: "Best Seller",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: 6,
    name: "State Champion Hoodie",
    price: 54.99,
    category: "hoodies",
    image: "/red-champion-hoodie.jpg",
    rating: 5,
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    id: 7,
    name: "NC Wrestling Compression Shirt",
    price: 34.99,
    category: "athletic-wear",
    image: "/navy-compression-athletic-shirt.jpg",
    rating: 4,
    badge: "New",
    sizes: ["YL", "S", "M", "L", "XL"],
  },
  {
    id: 8,
    name: "United Beanie",
    price: 19.99,
    category: "headwear",
    image: "/navy-blue-beanie-winter-hat.jpg",
    rating: 4,
    sizes: ["S", "M", "L"],
  },
]
