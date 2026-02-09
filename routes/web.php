<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/login', [App\Http\Controllers\Api\AuthController::class, 'login'])->name('login');
Route::post('/logout', [App\Http\Controllers\Api\AuthController::class, 'logout'])->name('logout');

// SPA fallback route: serve the same view for any non-API route so client-side routes work on refresh
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
