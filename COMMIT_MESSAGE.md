feat(vmix): блокировка кнопок плашек при одной плашке в эфире (тот же vMix-инпут)

Поведение:
- Когда несколько плашек ссылаются на один инпут в vMix и одна в эфире — остальные кнопки «Показать» для этого инпута недоступны; кнопка активной плашки доступна для «Скрыть плашку».
- Блокируются только кнопки, ссылающиеся на тот же vMix-инпут; плашки на другие инпуты остаются доступными.

Код:
- useVMix: функция isAnotherOverlayOnAirForSameInput(inputKey), проверка competingKeys.includes(inputKey).
- VMixOverlayButtons: проп isAnotherOverlayOnAirForSameInput, disabled = … || (anotherOnAir && !active), tooltip «Другая плашка этого инпута в эфире».
- MatchControlPage: передача isAnotherOverlayOnAirForSameInput из хука в VMixOverlayButtons.

Тесты:
- useVMix-overlay-same-input: isAnotherOverlayOnAirForSameInput при ref1 в эфире (ref2 true, ref1 false), при неактивном оверлее, при трёх плашках (other на инпут 14 — false).
- VMixOverlayButtons: кнопка disabled и title при isAnotherOverlayOnAirForSameInput(true для второго инпута).

Документация:
- vmix-overlay-same-input-refactoring.md: раздел про блокировку кнопок, тесты, принятое решение; удалена vmix-overlay-disable-same-input-instruction.md.
