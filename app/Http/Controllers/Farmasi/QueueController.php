<?php

namespace App\Http\Controllers\Farmasi;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('farmasi/antrean-resep');
    }
}
