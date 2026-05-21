const store = {
    users: [],
    suppliers: [
        {
            id: '1',
            name: 'Default Supplier',
            contact: 'contact@example.com'
        }
    ],
    products: [
        {
            id: '1',
            name: 'Brake Pads',
            description: 'Front brake pad set',
            price: 49.99,
            quantity: 20,
            supplierId: '1',
            category: 'Brakes'
        },
        {
            id: '2',
            name: 'Oil Filter',
            description: 'Engine oil filter',
            price: 12.99,
            quantity: 35,
            supplierId: '1',
            category: 'Filters'
        }
    ],
    orders: [],
    movements: [
        {
            id: '1',
            productId: '1',
            type: 'entry',
            quantity: 20,
            date: new Date().toISOString(),
            description: 'Initial stock'
        },
        {
            id: '2',
            productId: '2',
            type: 'entry',
            quantity: 35,
            date: new Date().toISOString(),
            description: 'Initial stock'
        }
    ]
};

module.exports = store;
