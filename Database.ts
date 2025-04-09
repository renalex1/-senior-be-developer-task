import { getRandomInt, sleep } from "./Util";

export enum Operations {
    ADD,
    SUBTRACT,
    SET
}

export class Database {

    private data: { [key: string]: number }

    constructor() {
        this.data = {};
    }

    set = async (message: Message): Promise<void> => {
        const current = this.data[message.key] || 0
        let result: number
        switch (message.operation) {
            case Operations.ADD:
                result = current + message.val
                break;
            case Operations.SUBTRACT:
                result = current - message.val
                break;
            case Operations.SET:
                result = message.val
                break;
            default:
                throw Error(`Invalid operation ${message.operation}`)
        }
        const randomDelay = getRandomInt(100)
        await sleep(randomDelay)
        this.data[message.key] = result
    }

    get = (key: string): number => {
        return this.data[key]
    }

    state = () => {
        return this.data
    }
}

export class Message {
    public key: string
    public operation: Operations
    public val: number
    public id: string

    constructor(key: string, operation: Operations, val: number) {
        this.key = key
        this.operation = operation
        this.val = val
        this.id = `${key}:${val}:${operation}:${Date.now()}:${Math.random()}`
    }
}