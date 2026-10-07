import { createClient } from '@supabase/supabase-js';
const client=()=>createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function uploadVoucher(file:File){
 const supabase=client(); const bucket=process.env.SUPABASE_STORAGE_BUCKET || 'vouchers'; const ext=file.name.split('.').pop()?.toLowerCase() || 'bin'; const key=`${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase.storage.from(bucket).upload(key,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false}); if(error) throw new Error('No se pudo almacenar el voucher');
 const {data}=await supabase.storage.from(bucket).createSignedUrl(key,60*60*24*7); if(!data?.signedUrl) throw new Error('No se pudo generar el enlace del voucher'); return {url:data.signedUrl,key};
}
