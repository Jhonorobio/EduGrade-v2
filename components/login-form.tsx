import React from 'react';
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "./ui/field"
import { Input } from "./ui/input"
import { Loader2 } from 'lucide-react';

interface LoginFormProps extends React.ComponentProps<"div"> {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function LoginForm({
  className,
  username,
  setUsername,
  password,
  setPassword,
  handleLogin,
  loading,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Inicia sesión en tu cuenta</CardTitle>
          <CardDescription>
            Ingresa tu usuario y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username" className="font-semibold">Usuario</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="tu.usuario"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="font-semibold">Contraseña</FieldLabel>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
              </Field>
              <Field className="pt-2">
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar sesión'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}