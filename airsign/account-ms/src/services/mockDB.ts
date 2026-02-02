
import { v4 as uuidv4 } from 'uuid';
import { IWallet, ITransaction } from '../models/Wallet';
import { IInvoice, IPayment, ISubscription } from '../models/Billing';

export class MockQuery<T = any> {
    private items: T[];

    constructor(items: T[]) {
        this.items = items;
    }

    sort(criteria: any) {
        // simplistic sort
        const key = Object.keys(criteria)[0];
        const order = criteria[key]; // 1 or -1
        this.items.sort((a, b) => {
            if ((a as any)[key] > (b as any)[key]) return order === 1 ? 1 : -1;
            if ((a as any)[key] < (b as any)[key]) return order === 1 ? -1 : 1;
            return 0;
        });
        return this.items; // resolve promise
    }

    session(s: any) {
        return this; // no-op
    }

    // make it awaitable
    then(resolve: any, reject: any) {
        resolve(this.items);
    }
}

export class MockDocument<T = any> {
    [key: string]: any; // Index signature to allow dynamic properties

    constructor(data: any, private store: any[]) {
        Object.assign(this, data);
    }

    async save(options?: any): Promise<this & T> {
        // update self in store
        const index = this.store.findIndex((i: any) => i._id === (this as any)._id);
        if (index !== -1) {
            this.store[index] = { ...this, updatedAt: new Date() };
        }
        return this as this & T;
    }

    toObject(): T {
        return { ...this } as unknown as T;
    }
}

export class MockModel<T = any> {
    public store: any[] = [];
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    findOne(query: any): any {
        const item = this.store.find(item => this.matches(item, query));
        const doc = item ? new MockDocument<T>(item, this.store) : null;

        // return an object that has .session() match which resolves to doc
        return {
            ...doc, // if await-ed directly
            session: () => doc,
            then: (resolve: any) => resolve(doc)
        } as any;
    }

    find(query: any): MockQuery<MockDocument<T> & T> {
        const items = this.store.filter(item => this.matches(item, query)).map(i => new MockDocument<T>(i, this.store) as MockDocument<T> & T);
        return new MockQuery<MockDocument<T> & T>(items);
    }

    findById(id: string): (MockDocument<T> & T) | null {
        const item = this.store.find((i: any) => (i.id === id || i._id === id));
        return item ? (new MockDocument<T>(item, this.store) as MockDocument<T> & T) : null;
    }

    async create(data: any[], options?: any): Promise<(MockDocument<T> & T)[]>;
    async create(data: any, options?: any): Promise<MockDocument<T> & T>;
    async create(data: any | any[], options?: any): Promise<(MockDocument<T> & T) | (MockDocument<T> & T)[]> {
        if (Array.isArray(data)) {
            const items = data.map(d => ({
                ...d,
                _id: d._id || uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
                id: d.id || uuidv4() // ensure id exists if not provided
            }));
            this.store.push(...items);
            return items.map(i => new MockDocument<T>(i, this.store) as unknown as MockDocument<T> & T);
        }
        const newItem = {
            ...data,
            _id: data._id || uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            id: data.id || uuidv4()
        };
        this.store.push(newItem);
        return new MockDocument<T>(newItem, this.store) as unknown as MockDocument<T> & T;
    }

    matches(item: any, query: any) {
        for (const key in query) {
            if (query[key] === undefined) continue;
            if (item[key] !== query[key]) return false;
        }
        return true;
    }
}

export const MockWallet = new MockModel<IWallet>('Wallet');
export const MockTransaction = new MockModel<ITransaction>('Transaction');
export const MockInvoice = new MockModel<IInvoice>('Invoice');
export const MockPayment = new MockModel<IPayment>('Payment');
export const MockSubscription = new MockModel<ISubscription>('Subscription');

export const mockMongoose = {
    startSession: async () => ({
        startTransaction: () => { },
        commitTransaction: async () => { },
        abortTransaction: async () => { },
        endSession: () => { }
    }),
    isValidObjectId: (id: string) => true, // simplistic
    Schema: { Types: { Mixed: {} } }
};
