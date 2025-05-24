import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_module:skip_cache';
export const SkipCache = () => SetMetadata(CACHE_KEY_METADATA, true);