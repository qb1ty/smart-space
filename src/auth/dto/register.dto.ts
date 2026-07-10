import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
    @IsEmail({},  { message: "Некорректный формат email" })
    email!: string;

    @IsString()
    @MinLength(8, { message: "Пароль должен быть не менее 6 символов" })
    password!: string

    @IsString()
    @IsNotEmpty({ message: "Имя обязательно для заполенения" })
    firstname!: string

    @IsString()
    @IsNotEmpty({ message: "Фамилия обязательна для заполнения" })
    lastname!: string
} 