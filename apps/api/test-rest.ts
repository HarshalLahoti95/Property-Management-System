import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JwtService } from '@nestjs/jwt';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  
  const token = jwtService.sign({ sub: 'landlord-1', email: 'landlord@test.com', role: 'LANDLORD' }, { secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev-only-change-in-prod' });
  
  const res = await fetch('http://localhost:3000/api/v1/documents/2c9c7a18-590f-40c7-bf68-80e3fd1cd07c/stream', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  if (!res.ok) console.log('Body:', text);
  else console.log('Body length:', text.length);
  
  await app.close();
}
test();
