
export interface Accessible {
    from?: string;
    to?: string;
    limit?: number;
    message?: string;
}

export interface MailConfirmSelf {
    to: string;
    subject: string;
    template: string;
}

export interface MailConfirmUser {
    to: string;
    subject: string;
    template: string;
    attachments: string[];
}

export interface Field {
    type: string
    title: string
    name: string
    values?: string[]
    required?: boolean
    pattern?: string
    position?: string
}

export interface FormData {
    username?: string;
    password?: string;
    title: string;
    description?: string;
    logo?: string;
    template?: string;
    submitButtonText: string;
    accessible?: Accessible;
    mailConfirmSelf?: MailConfirmSelf;
    mailConfirmUser?: MailConfirmUser;
    successMessage: string;
    fields: Field[]
}