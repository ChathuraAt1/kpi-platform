<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;
    use \Illuminate\Foundation\Testing\WithFaker;
    use \Illuminate\Foundation\Testing\Concerns\InteractsWithExceptionHandling;

    use \Illuminate\Foundation\Testing\Concerns\ProvidesApplication; // lightweight placeholder

    // In a full Laravel app, you'd use CreatesApplication trait. For these tests we assume application bootstrapping is handled.
}
