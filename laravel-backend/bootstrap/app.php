<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
          api: __DIR__.'/../routes/api.php',

        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // What a missing record says to whoever asked for it.
        //
        // Laravel answers a `findOrFail` with "No query results for model
        // [App\Models\Product] 99999". That names the framework, the internal
        // class and the namespace to anyone who asks for an id that is not
        // there — and it is the string a phone app would put in front of a
        // shopper, because an app has no page of its own to fall back on.
        //
        // Caught as NotFoundHttpException, not ModelNotFoundException: the
        // framework converts the one into the other before these callbacks
        // run. Doing it here also covers a plain abort(404).
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'ئەمە نەدۆزرایەوە.',
                    'error' => 'not_found',
                ], 404);
            }
        });
    })->create();
