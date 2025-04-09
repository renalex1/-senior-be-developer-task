import {  Message } from "./Database";

export class Queue {
    private messages: Message[]

    constructor() {
        this.messages = []
    }

    Enqueue = (message: Message) => {
        this.messages.push(message)
    }

    Dequeue = (workerId: number): Message | undefined => {
        return this.messages.splice(0,1)[0]
    }

    Confirm = (workerId: number, messageId: string) => {

    }

    Size = () => {
        return this.messages.length
    }
}

