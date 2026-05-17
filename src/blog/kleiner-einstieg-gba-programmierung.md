---
title: Kleiner Einstieg in die Game Boy Advance Programmierung
date: 2022-06-10
---

Ich wollte schon seit längerem wieder einen Post schreiben und eigentlich wollte ich ja mal öfter was posten.
Aber dadurch das der Blog hier noch halbfertig ist, schiebe ich das ständig vor mich hin. Ich hab den [Source-Code aber auf Github](https://github.com/tolik518/blog.returnnull.de) veröffentlich. Also wer Bugs findet, muss die nicht für sich behalten :)

In den letzten Tagen hab ich mich ein Bisschen mit C beschäftigt. Genauer genommen mit <a id="tonc">GBAProgramming</a>.
Ich wollte mich schon seit Ewigkeiten damit beschäftigen aber der Einstieg sah für mich immer so kompliziert aus, weswegen ich nie damit angefangen hab.
Vor über 10 Jahren hab ich mich schon in der Pokémon ROM-Hacking-Szene bewegt und hatte immer Lust was eigenes zu machen — damals konnte ich aber noch nicht wirklich programmieren.

In meiner Ausbildung hab ich mich zuletzt viel mit Docker auseinandergesetzt, also kam mir die Idee das ich doch die ganze GBA Entwicklungsumgebung — DevkitARM/libgba/libtonc — ja gar nicht auf meiner lokalen Maschine installieren muss, sondern ganz einfach containerisieren kann! Dann hätte ich weniger Probleme mit den ganzen Dependencies und könnte auf meinem Linux-System und auf dem Windows-Rechner daran arbeiten, oder?
[Am Ende war es auch wirklich so einfach!](https://github.com/tolik518/GBA_Dev_Docker_Template) Ab da war ich ein bisschen gehyped, um ehrlich zu sein. Am Ende hab ich sogar statt dem offiziellen [Docker-Image für Devkitpro](https://hub.docker.com/r/devkitpro/devkitarm/tags) lieber einen [eigenen Multi-Stage-Build](https://github.com/tolik518/GBA_Dev_Docker_Template/blob/b62fd56e61999fc2c560355649a7b07b84f26383/docker/dkp_compiler/Dockerfile) geschrieben und mir damit über einen Gigabyte Speicherplatz gespart.

Ich wollte schnell ein Pong für GBA schreiben, aber ich hab relativ schnell gemerkt das ich ja gar kein C kann... und keine Ahnung hab wie Spiele programmiert werden.
Nur weil ich mit C# Windows-Anwendungen und mit PHP und TypeScript kleinere Webseiten geschrieben hab, heißt es anscheinend noch lange nicht das man mit C, auf eingeschränkter Hardware, Spiele schreiben kann. ¯\_(ツ)\_/¯

Schade eigentlich. Am Ende heißt es aber einfach nur das es mehr Zeit in Anspruch nehmen wird als erwartet und das ich viel lernen müssen werde. Ich hab auf jeden Fall Bock. Das coolste was ich bisher gelernt hab ist das `a[i]` eigentlich nur Shorthand für `*(a+i)` ist — also ein Pointer auf `a` plus `i`. Dadurch das man bei einer Addition die Summanden vertauschen kann, kann man auch `*(i+a)` schreiben, oder `i[a]` als Shorthand. Ist logisch soweit, aber dann heißt es das ich anstatt `meinArray[0]` auch `0[meinArray]` schreiben kann. Das ist schon sehr absurd tbh.

Ich hoffe mein nächster Blog-Eintrag kommt bald und hat mehr schicke Bilder als langweiligen Text.

<script>
  ["click", "mouseover"].forEach(function(evt) {
    document.getElementById("tonc").addEventListener(evt, function() {
      var input     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      var output    = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm';
      var index     = x => input.indexOf(x);
      var translate = x => index(x) > -1 ? output[index(x)] : x;
      document.getElementById("tonc").innerText =
        document.getElementById("tonc").innerText.split('').map(translate).join('');
    });
  });
</script>
