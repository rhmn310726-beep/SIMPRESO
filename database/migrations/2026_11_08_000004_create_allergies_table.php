<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allergies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('allergen');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['patient_id', 'allergen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allergies');
    }
};
