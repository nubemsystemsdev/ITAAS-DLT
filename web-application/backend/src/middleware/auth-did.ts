// /**
//  * Middleware de autenticación DID
//  */

// import { Request, Response, NextFunction } from 'express';
// import { DIDService } from '../services/did-service';

// /**
//  * Middleware que verifica credencial DID
//  * Header esperado: Authorization: Bearer <vcJwt>
//  */
// export async function authenticateWithDID(
//     req: Request,
//     res: Response,
//     next: NextFunction
// ): Promise<void> {
//     try {
//         const authHeader = req.headers.authorization;
        
//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             res.status(401).json({
//                 error: 'Missing or invalid Authorization header',
//                 message: 'Expected: Authorization: Bearer <vcJwt>'
//             });
//             return;
//         }
        
//         const vcJwt = authHeader.substring(7);
        
//         const didService = DIDService.getInstance();
//         const verification = await didService.verifyCredential(vcJwt);
        
//         if (!verification.valid) {
//             res.status(401).json({
//                 error: 'Invalid credential',
//                 message: verification.error
//             });
//             return;
//         }
        
//         req.didAuth = {
//             did: verification.did!,
//             ethereumAddress: verification.credentialSubject!.ethereumAddress,
//             entityType: verification.credentialSubject!.entityType,
//             username: verification.credentialSubject!.username,
//             credentialSubject: verification.credentialSubject,
//             verified: true
//         };
        
//         next();
        
//     } catch (error) {
//         res.status(500).json({
//             error: 'Authentication error',
//             message: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// }

// /**
//  * Middleware que requiere DID obligatoriamente
//  */
// export function requireDIDAuth(
//     req: Request,
//     res: Response,
//     next: NextFunction
// ): void {
//     if (!req.didAuth || !req.didAuth.verified) {
//         res.status(401).json({
//             error: 'DID authentication required'
//         });
//         return;
//     }
    
//     next();
// }

// /**
//  * Middleware que verifica tipo de entidad
//  */
// export function requireEntityType(...allowedTypes: ('user' | 'ai')[]) {
//     return (req: Request, res: Response, next: NextFunction): void => {
//         if (!req.didAuth) {
//             res.status(401).json({ error: 'Authentication required' });
//             return;
//         }
        
//         if (!allowedTypes.includes(req.didAuth.entityType)) {
//             res.status(403).json({
//                 error: 'Forbidden',
//                 message: `Only for: ${allowedTypes.join(', ')}`
//             });
//             return;
//         }
        
//         next();
//     };
// }