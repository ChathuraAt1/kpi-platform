<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// SPA fallback route: serve the same view for any non-API route so client-side routes work on refresh
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
